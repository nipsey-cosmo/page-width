import { MarkdownView, Plugin } from 'obsidian';
import { dragWidth, isValidWidth } from './width';

const PRESETS = [
	{ label: 'Narrow', width: '700px' }, // Obsidian's own default for --file-line-width
	{ label: 'Wide', width: '1100px' },
	{ label: 'Max', width: '100%' },
];
const DEFAULT_WIDTH = '700px';
const HOST_CLASS = 'page-width-host';

interface PageWidthData {
	width: string;
}

export default class PageWidthPlugin extends Plugin {
	private width = DEFAULT_WIDTH;
	private buttons: HTMLButtonElement[] = [];

	async onload() {
		const data = (await this.loadData()) as Partial<PageWidthData> | null;
		this.setWidth(isValidWidth(data?.width) ? data.width : DEFAULT_WIDTH);

		const bar = this.addStatusBarItem();
		bar.addClass('page-width-bar');
		for (const preset of PRESETS) {
			const button = bar.createEl('button', {
				text: preset.label,
				cls: 'page-width-button',
				attr: { type: 'button', 'aria-label': `Page width: ${preset.label}` },
			});
			button.dataset.width = preset.width;
			// Mouse clicks must not take focus from the editor (typing/Space would hit the button).
			// Only mousedown is cancelled, so Tab focus and keyboard activation still work.
			this.registerDomEvent(button, 'mousedown', (e) => e.preventDefault());
			this.registerDomEvent(button, 'click', () => {
				this.setWidth(preset.width);
				void this.save();
			});
			this.buttons.push(button);
		}
		this.updateButtons();

		// Handles go on every markdown view: existing ones once the workspace is ready,
		// new ones (new tabs, splits, un-deferred leaves) as the layout changes.
		this.app.workspace.onLayoutReady(() => this.attachAll());
		this.registerEvent(this.app.workspace.on('layout-change', () => this.attachAll()));
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.attachAll()));

		this.register(() => {
			document.body.style.removeProperty('--file-line-width');
			document.querySelectorAll<HTMLElement>(`.${HOST_CLASS}`).forEach((host) => detach(host));
			// Leaves moved to pop-out windows live in another document; reach them via the workspace.
			for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
				if (leaf.view instanceof MarkdownView) detach(leaf.view.contentEl);
			}
		});
	}

	private setWidth(width: string) {
		this.width = width;
		// Obsidian's readable-line-length rules size both modes from this one variable:
		// edit `.cm-sizer` and reading `.markdown-preview-sizer` get max-width: var(--file-line-width).
		document.body.style.setProperty('--file-line-width', width);
		this.updateButtons();
	}

	private async save() {
		await this.saveData({ width: this.width } satisfies PageWidthData);
	}

	private updateButtons() {
		for (const button of this.buttons) {
			const active = button.dataset.width === this.width;
			button.toggleClass('is-active', active);
			button.setAttribute('aria-pressed', String(active));
		}
	}

	private attachAll() {
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			// Deferred (not yet loaded) leaves are not MarkdownViews; they get handles when revealed.
			if (!(leaf.view instanceof MarkdownView)) continue;
			// Pop-out windows have their own <body>, which this plugin does not style. A leaf moved to
			// a pop-out keeps its DOM (and any handles), so strip them rather than only skipping.
			if (leaf.view.contentEl.ownerDocument !== document) detach(leaf.view.contentEl);
			else this.attach(leaf.view);
		}
	}

	private attach(view: MarkdownView) {
		const host = view.contentEl; // `.view-content`, parent of both the edit and reading containers
		if (host.hasClass(HOST_CLASS)) return;
		host.addClass(HOST_CLASS);
		// Positioning is pure CSS (styles.css), so nothing here needs re-measuring on resize.
		// The overlay mirrors the scroller's box (including its scrollbar gutter); the handle sits inside it.
		const overlay = host.createDiv({ cls: 'page-width-handles' });
		// One handle, on the right: the drag is symmetric, so one edge sets any width, and the left
		// margin stays clear for Obsidian's heading fold arrows.
		const handle = overlay.createDiv({ cls: 'page-width-handle mod-right' });
		// Plain listeners, not this.registerDomEvent: those would keep closed views alive until
		// plugin unload. The listeners go away with the overlay (removed by detach on unload).
		handle.addEventListener('pointerdown', (e) => this.startDrag(e, view, handle));
		// The handle sits over the scroller's margin, so pass wheel scrolling through to it.
		handle.addEventListener('wheel', (e) => scrollerOf(view)?.scrollBy(e.deltaX, e.deltaY), {
			passive: true,
		});
	}

	private startDrag(e: PointerEvent, view: MarkdownView, handle: HTMLElement) {
		if (e.button !== 0) return;
		const scroller = scrollerOf(view);
		if (!scroller) return;
		e.preventDefault();

		// The column is centred inside the scroller's content box: inside its padding
		// (--file-margins) and excluding its scrollbar gutter, which clientWidth already omits.
		const style = getComputedStyle(scroller);
		const paddingLeft = parseFloat(style.paddingLeft);
		const available = scroller.clientWidth - paddingLeft - parseFloat(style.paddingRight);
		const centreX = scroller.getBoundingClientRect().left + scroller.clientLeft + paddingLeft + available / 2;

		// Pointer capture keeps move events coming even when the pointer leaves the thin handle.
		handle.setPointerCapture(e.pointerId);
		handle.addClass('is-dragging');
		const onMove = (ev: PointerEvent) => this.setWidth(dragWidth(ev.clientX, centreX, available));
		// pointerup/pointercancel are the normal ends; lostpointercapture is a fallback (e.g. capture
		// released some other way). Whichever comes first ends the drag; the rest are no-ops.
		const endEvents = ['pointerup', 'pointercancel', 'lostpointercapture'] as const;
		const onEnd = () => {
			handle.removeEventListener('pointermove', onMove);
			for (const type of endEvents) handle.removeEventListener(type, onEnd);
			handle.removeClass('is-dragging');
			void this.save(); // persist once per drag, not on every move
		};
		handle.addEventListener('pointermove', onMove);
		for (const type of endEvents) handle.addEventListener(type, onEnd);
	}
}

/** The element that scrolls and pads the column in the view's current mode. */
function scrollerOf(view: MarkdownView): HTMLElement | null {
	// Descendant selectors, not child chains: the wrappers between these elements have changed
	// across Obsidian versions. querySelector returns the first match in document order, which is
	// the outer scroller, before any nested one (embeds, table cell editors).
	const selector =
		view.getMode() === 'preview'
			? '.markdown-reading-view .markdown-preview-view'
			: '.markdown-source-view .cm-scroller';
	return view.contentEl.querySelector<HTMLElement>(selector);
}

function detach(host: HTMLElement) {
	host.querySelector(':scope > .page-width-handles')?.remove();
	host.removeClass(HOST_CLASS);
}

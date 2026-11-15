import { MarkdownView, Plugin } from 'obsidian';
import { dragWidth } from './width';

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
		this.setWidth(typeof data?.width === 'string' ? data.width : DEFAULT_WIDTH);

		const bar = this.addStatusBarItem();
		bar.addClass('page-width-bar');
		for (const preset of PRESETS) {
			const button = bar.createEl('button', {
				text: preset.label,
				cls: 'page-width-button',
				attr: { type: 'button', 'aria-label': `Page width: ${preset.label}` },
			});
			button.dataset.width = preset.width;
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
			document.querySelectorAll('.page-width-handles').forEach((el) => el.remove());
			document.querySelectorAll(`.${HOST_CLASS}`).forEach((el) => el.removeClass(HOST_CLASS));
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
			if (leaf.view instanceof MarkdownView) this.attach(leaf.view);
		}
	}

	private attach(view: MarkdownView) {
		const host = view.contentEl; // `.view-content`, parent of both the edit and reading containers
		// Pop-out windows have their own <body>, which this plugin does not style, so skip them.
		if (host.ownerDocument !== document || host.hasClass(HOST_CLASS)) return;
		host.addClass(HOST_CLASS);
		// Positioning is pure CSS (styles.css), so nothing here needs re-measuring on resize.
		// The overlay mirrors the scroller's box (including its scrollbar gutter); the handles sit inside it.
		const overlay = host.createDiv({ cls: 'page-width-handles' });
		for (const side of ['left', 'right']) {
			const handle = overlay.createDiv({ cls: `page-width-handle mod-${side}` });
			this.registerDomEvent(handle, 'pointerdown', (e) => this.startDrag(e, view, handle));
		}
	}

	private startDrag(e: PointerEvent, view: MarkdownView, handle: HTMLElement) {
		if (e.button !== 0) return;
		// The column is centred inside the scroller's content box: inside its padding
		// (--file-margins) and excluding its scrollbar gutter, which clientWidth already omits.
		const selector =
			view.getMode() === 'preview'
				? ':scope > .markdown-reading-view > .markdown-preview-view'
				: ':scope > .markdown-source-view > .cm-editor > .cm-scroller';
		const scroller = view.contentEl.querySelector<HTMLElement>(selector);
		if (!scroller) return;
		e.preventDefault();

		const style = getComputedStyle(scroller);
		const paddingLeft = parseFloat(style.paddingLeft);
		const available = scroller.clientWidth - paddingLeft - parseFloat(style.paddingRight);
		const centreX = scroller.getBoundingClientRect().left + scroller.clientLeft + paddingLeft + available / 2;

		// Pointer capture keeps move events coming even when the pointer leaves the thin handle.
		handle.setPointerCapture(e.pointerId);
		handle.addClass('is-dragging');
		const onMove = (ev: PointerEvent) => this.setWidth(dragWidth(ev.clientX, centreX, available));
		// lostpointercapture fires on both pointerup and pointercancel.
		const onEnd = () => {
			handle.removeEventListener('pointermove', onMove);
			handle.removeEventListener('lostpointercapture', onEnd);
			handle.removeClass('is-dragging');
			void this.save(); // persist once per drag, not on every move
		};
		handle.addEventListener('pointermove', onMove);
		handle.addEventListener('lostpointercapture', onEnd);
	}
}

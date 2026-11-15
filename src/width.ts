// Pure width maths, kept free of Obsidian imports so `npm run check` can run it in plain node.

export const MIN_WIDTH_PX = 400;

/**
 * Width (as a CSS value) for a symmetric drag: the column stays centred, so the
 * new width is twice the pointer's distance from the centre of the pane's content area.
 * Clamped to [MIN_WIDTH_PX, available]. Reaching the available width returns "100%"
 * so the column keeps filling the pane if it is later resized.
 */
export function dragWidth(pointerX: number, centreX: number, available: number): string {
	const raw = 2 * Math.abs(pointerX - centreX);
	const clamped = Math.min(Math.max(raw, MIN_WIDTH_PX), available);
	return clamped >= available ? '100%' : `${Math.round(clamped)}px`;
}

# Page Width

Obsidian plugin (desktop only) that sets the readable line width (`--file-line-width`).

- Drag the thin handles at the left or right edge of the text column in any markdown view (edit or reading mode). The column stays centred; minimum 400px, maximum the pane width.
- Or click **Narrow** (700px, Obsidian's default), **Wide** (1100px) or **Max** (100%) in the status bar.

Requires Settings → Editor → "Readable line length" to be on. The width is global and saved between sessions.

## Development

```
npm install
npm run build   # type-check + bundle to main.js
npm run check   # assertions for the drag-width maths
```

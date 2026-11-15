# Page Width

> [!NOTE]
> Page Width needs Obsidian's "Readable line length" setting, which is **on by default**.
> Only if you turned it off: turn it on again in Settings → Editor → Readable line length.
> The grip and the buttons have no effect while it is off.

Obsidian plugin (desktop only) that sets the readable line width (`--file-line-width`).

- Drag the small grip at the right edge of the text column in any markdown view (edit or reading mode). The column stays centred; minimum 400px, maximum the pane width.
- Or click **Narrow** (700px, Obsidian's default), **Wide** (1100px) or **Max** (100%) in the status bar.

<img width="816" height="448" alt="image" src="https://github.com/user-attachments/assets/8ea9ec5c-babe-44fa-8a16-ef5a34fe7978" />

The width is global and saved between sessions.

## Install

Download `main.js`, `manifest.json` and `styles.css` from the latest release into `<vault>/.obsidian/plugins/page-width/`, then enable Page Width in Settings → Community plugins.

## Development

```
npm install
npm run build   # type-check + bundle to main.js
npm run check   # assertions for the drag-width maths
```

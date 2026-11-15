# Page Width

Obsidian plugin (desktop only) that sets the readable line width (`--file-line-width`).

- Drag the small grip at the left or right edge of the text column in any markdown view (edit or reading mode). The column stays centred; minimum 400px, maximum the pane width.
<img width="1095" height="512" alt="image" src="https://github.com/user-attachments/assets/cf79ef11-4687-4670-a6bf-d6c34dc3be36" />
- Or click **Narrow** (700px, Obsidian's default), **Wide** (1100px) or **Max** (100%) in the status bar.
<img width="702" height="449" alt="image" src="https://github.com/user-attachments/assets/9abd9234-0d5e-420a-82aa-8778ec94572d" />


Requires Settings → Editor → "Readable line length" to be on. The width is global and saved between sessions.

## Install

Download `main.js`, `manifest.json` and `styles.css` from the latest release into `<vault>/.obsidian/plugins/page-width/`, then enable Page Width in Settings → Community plugins.

## Development

```
npm install
npm run build   # type-check + bundle to main.js
npm run check   # assertions for the drag-width maths
```

# Changelog

Notable changes to Baipix, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Numbers in parentheses are pull requests.

## [Unreleased]

### Added

- A Lasso fill tool (K), next to the Pencil: draw a shape freehand and it closes and fills when you let go. The Pencil's "Fill the shape" option stays for those who prefer it. (#188)
- Lasso fill: with "Fill the shape when the stroke ends" in the Pencil's "…" menu, a stroke closes back to its start when it ends and the shape it draws is filled, with the current color, dithering and symmetry. One undo step. (#186)
- The Pencil's options bar is shorter: dithering, lasso fill and Blend move to a "…" menu (Blend too for the Spray), with a blue dot on it when one of them is on. (#186)
- A Remap tab in the Adjustments panel, to move a drawing to another palette or clean it up: pick a preset or the file's palette, match colors to the nearest one or by lightness (darkest to darkest, which recolors and keeps shadows and highlights), reduce how many colors are used, and optionally replace the file's palette. Live preview, one undo step. (#184)
- A Stabilizer for the Pencil and the Eraser (0 to 10): the stroke follows the pointer on a string that many pixels long, so shaky hands, a mouse or a stylus give smooth lines. It also smooths Lighten, Shade, Blur, Spray and Jumble. Off by default. (#182)
- A Blend option for the Pencil and the Spray: a semi-transparent color mixes with the pixels underneath, like watercolor, instead of replacing them. Going over the same spot again in one stroke doesn't build it up. (#179)
- A round brush tip, next to the size in the tool options: from 3px it paints a round shape instead of a square, for the Pencil, the Eraser, shapes, Lighten, Shade and Blur. (#178)
- A Spray tool (A): it drops random pixels in a circle, like a spray can, and keeps spraying while you hold still. Options for size, density and a random opacity per pixel. Works with symmetry and the selection. (#177)
- A Jumble tool (J): it shuffles the pixels under the brush without adding any color, for texture on foliage, rock or noise, and keeps going while you hold still. Options for size and strength. (#177)
- The opacity of the copies in tile preview can be set, under the Tile preview box: at 100% they look exactly like the drawing, to see the pattern as it will repeat. (#176)
- With the Move tool, the active layer is framed like a selected object: a blue frame around its pixels with white corner handles and its size in pixels under it, following the layer while it moves. (#156)
- With the Move tool, a click beside every layer drops the active layer's frame, like clicking an empty spot in a design tool, instead of moving the active layer. A hole inside the frame still moves it, and so does Cmd/Ctrl. (#159)
- A reference image to trace over. It shows at the bottom of the Layers panel and works like a layer: select it, hide it, lock it, set its opacity, drag it with the Move tool (which takes it where no layer has a pixel) and resize it by the corners. It always stays under the layers and is never exported. Add one with the image button of the Layers panel, from the new file dialog, or with "Use as reference" after pasting or dropping an image. It's saved with the drawing in the browser, not in .baipix files. (#151)
- On phones, the colors stay in view in a strip above the toolbar: tap a swatch for the primary color, long press for the secondary one, tap a chip to open the color picker. (#146)
- A home screen: a welcome on first launch, Create and Import buttons, and your drawings as thumbnails with their last modified date, newest first. Open it from the main menu. The last file can now be deleted too, which brings back the empty home screen. (#143)

### Changed

- Layer and file thumbnails follow the drawing's proportions (up to 2:1 either way), so a wide drawing shows as a wide thumbnail instead of a thin strip in a square. (#185)
- "Adjust colors" becomes the Adjustments panel, ready for more kinds of adjustments. Besides the main menu and Ctrl+U, it opens from a button in the Layer section and from the layer right-click menu, starting on the active layer. (#183)
- With "Adjust the palette too" checked, the palette now previews the adjustment live, and undoing the adjustment puts back the palette along with the pixels, so they stay in step. (#183)
- The opacity of the colors can be scrubbed like the canvas fields: drag its ◐ label left or right. For the background, one drag is one undo step. (#181)
- The Primary and Secondary labels next to the colors are gone, to give the fields more room: hovering the swatch says which is which, and which click paints with it. (#181)
- The brush outline under the pointer is dark with a white edge, so it shows on black pixels too. (#177)
- Moving a layer off the canvas keeps its pixels: move it back, or make the canvas bigger, and they come back. Making the canvas smaller keeps what it cuts off too. The part outside is saved with the drawing in the browser, not in .baipix files, and is never exported. (#154)
- The Move tool takes the layer under the pointer: drag any pixel to move its layer, with its outline shown on hover. Cmd/Ctrl keeps the active layer. The tool has a pixel arrow as icon and cursor. (#148)
- The pixel grid stays visible on any drawing: its lines are dark on light pixels and light on dark ones, instead of following the app theme. (#145)
- The eyedropper cursor is the pixel pipette of the toolbar, with a white edge so it shows on any color. (#144)
- A new pixel look for the editor: pixel art icons, side panels floating over the canvas, notched corners and hard shadows, key-style buttons like on the website, pixel checkboxes, and a sky blue for hovers and the main button. The dark theme is now neutral gray. (#131)

### Fixed

- A key with no name could switch to the rounded rectangle, because tools without a shortcut matched it. (#176)
- In the light theme, muted text, menu shortcuts and the blue focus lines now meet the contrast minimum (4.5:1 for text, 3:1 for lines). (#175)
- Long file and layer names no longer make the left panel scroll sideways: they're cut with an ellipsis, with the full name on hover. Names and sizes now use the whole row, and the action icons show over the end of it on hover. (#153)
- On iPhone, editing a file name or any field no longer zooms the whole interface. (#149)

### Website

- The design system shows the tabs. (#184)
- The design system shows the color row (swatch, hex and opacity). (#181)
- The design system shows the segmented icon buttons (like the brush tip choice). (#179)
- A design system page at /app/design.html: the logo with SVG and PNG downloads, every color token in light and dark, type, shapes, icons, the components in their states, and a live contrast check. DESIGN.md sums up the rules for contributors. (#175)
- The screenshot on the home page and in the README shows the new pixel look, in a pixel frame with notched corners and a solid side like the buttons. (#132)

- Page view counts with Cloudflare Web Analytics, without cookies, on the site and the editor. Drawings and what you do in the editor are never sent. (#130)
- A new screenshot of the editor on the home page, in light or dark to match the site theme. (#128)
- Nine features on the home page instead of six, and three new gallery pieces: a starfighter sprite, Mount Fuji at dawn and an isometric ramen shop. (#126)

## [0.2.0] - 2026-09-28

Everyday comfort: small things that make daily use smoother.

### Added

- The drawing's size, number of layers and number of colors next to the cursor coordinates. (#125)
- A hand tool (H) in the toolbar to move around the canvas, also with one finger on touch screens. (#118)
- Select several layers at once with Shift+click and Cmd/Ctrl+click, then drag, delete or merge them together. Flatten image in the layer menu. (#115)
- Drag the symmetry axes anywhere on the canvas, snapped to half pixels. Double-click a grip to recenter. (#116)
- Open and export palette files in .hex (Lospec) and .gpl (GIMP, Aseprite, Krita), or drop one on the canvas. 14 more preset palettes, and Manage palettes to choose which ones show in the menu. (#112)
- A live preview of the exported image in the Export tab, with its final size, 1× to 32× buttons, the file name, and an option to leave the background out. (#109)
- Design and Export tabs in the right panel. (#108)
- Reorder the palette by dragging its swatches. (#107)
- A loupe for the eyedropper, with the hex code of the picked color. (#106)
- Lighten and shade can stay in the color's ramp (the new default), use the whole palette, or change the lightness freely, with an optional hue shift. (#104)
- Tool options in a bar right above the toolbar. (#56)
- Recent colors under the primary and secondary colors. (#51)
- A right-click menu on layers, and Merge visible layers. (#52)
- Lock a layer, and Alt+click its eye to show only that one. (#50)
- Collapsible sections in the panels. (#49)
- Undo in the toast after deleting a layer or a file, instead of a confirmation. (#42)
- Animated marching ants around the selection. (#41)
- Double-click the zoom level to fit the drawing to the screen. (#40)
- A visible button for the keyboard shortcuts. (#37)
- The version number in the main menu, with a link to this changelog.

### Changed

- The pixel gap is set in the Canvas section and always shown on the canvas. (#114)
- The dark theme has a slight ink tint, and the symmetry axes are pink. (#58)
- The palette menu shows either Add or Remove the primary color, and its items are grouped more clearly. (#112)
- Toasts are light in the dark theme, so they stand out from the canvas. (#123)

### Website

- The website and the editor move to [baipix.app](https://baipix.app). The old address redirects there.
- A pixel art 404 page. (#111)
- Light and dark mode, with a toggle. (#46)
- Pixel style buttons. (#48)
- The features mention the familiar interface and the movable symmetry axes. (#54, #116)

### Thanks

- [@QvarcY](https://github.com/QvarcY) for the first community contributions: the shortcuts button, fitting the drawing from the zoom level, and the marching ants. (#37, #40, #41)

## [0.1.0]

The first public version.

- A pixel art editor in the browser: pencil with pixel-perfect mode, eraser, paint bucket, selection and move, eyedropper, lines and shapes, palette-aware shade, lighten and blur.
- Layers, several files, symmetry, tile preview, checkerboard dithering, rotation and flips.
- Preset palettes, Lospec palettes by pasting, palettes built from the drawing, hue-shifted ramps.
- Exports to PNG, clean SVG (one path per color), copy as SVG or PNG, .baipix project files, with a pixel size and a gap between pixels.
- Everything saved in the browser, English and French, light and dark themes.
- The website, with a gallery of drawings rendered by the editor itself.

[Unreleased]: https://github.com/baipix/baipix/compare/v0.2.0...main
[0.2.0]: https://github.com/baipix/baipix/releases/tag/v0.2.0

# Changelog

Notable changes to Baipix, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Numbers in parentheses are pull requests.

## [Unreleased]

### Changed

- A new pixel look for the editor: pixel art icons, side panels floating over the canvas, notched corners and hard shadows, key-style buttons like on the website, pixel checkboxes, and a sky blue for hovers and the main button. The dark theme is now neutral gray. (#131)

### Website

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

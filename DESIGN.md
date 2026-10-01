# Design system

The living reference is the design system page: run `npm run dev` and open
[localhost:5173/design.html](http://localhost:5173/design.html), or see it online at
[baipix.app/app/design.html](https://baipix.app/app/design.html). It's built from the editor's own
components and stylesheets, so it can't drift from them: colors are read from the tokens, contrast is
measured live, and the logo files are generated from the same drawing as in the app.

The short version, for when you add or change something in the interface:

- **Colors.** Every color is a token in `src/ui/styles/tokens.css`, written once as
  `light-dark(light, dark)`. Don't write a color anywhere else. The canvas renderer reads the same tokens.
- **Blue is for interaction only** (`--glow`, `--glow-line`): hover, focus, the main button, what's
  selected or about to be acted on. At rest the interface stays neutral.
- **Pixel shapes.** No rounded corners: controls use `clip-path: var(--notch)`, floating surfaces are a
  2px ring plus a hard shadow (`--hard-shadow`), and keys have a solid side they sink into.
- **Buttons.** `.btn` for actions in panels and dialogs, `.btn-primary` for the one main action,
  `.action-btn` for big actions on full screens (the home screen), `IconButton` for compact actions.
- **Icons.** Pixelarticons on a 12×12 grid, at multiples of 6 px. When one is missing, draw it on the
  same grid with `drawn()` in `src/ui/icons.tsx`.
- **Text.** Inter, 11 px in the interface. Copy is short and plain, in English and French
  (`src/i18n`).
- **Accessibility.** Text contrast of at least 4.5:1 and lines of 3:1 in both themes (the design
  system page checks it), a label on every icon button, a visible focus, and “reduce motion” respected.
- **The logo** is the 8×8 drawing in `src/ui/icons.tsx` (`LOGO`). Scale it by multiples of 8 px and never
  smooth it. Download it from the design system page.

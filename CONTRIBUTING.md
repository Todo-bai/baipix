# Contributing to Baipix

Thanks for your interest! Here is how to get productive quickly.

## Setup

```bash
npm install
npm run dev
```

Before opening a pull request, make sure everything passes:

```bash
npm run typecheck && npm run lint && npm test
```

The CI runs the same checks on every pull request.

## Ground rules

- **The engine stays pure.** Nothing in `src/engine` may touch the DOM, `window` or React. This keeps it testable and reusable. Browser-specific code goes in `src/io` or `src/ui`.
- **The UI talks to the engine only through `Editor`.** Components read state with `useEditorState(selector)` and call editor methods. They never mutate documents directly.
- **Every visible string is translated.** Add the key to `src/i18n/en.ts`, then to `src/i18n/fr.ts` (TypeScript will fail if a language misses a key).
- **Test engine changes.** Tests live in `tests/`, next to the feature they cover.
- Code is formatted with Prettier (`npm run format`).

## Adding a tool

1. Create `src/engine/tools/myTool.ts` exporting a `Tool` (see `pencil.ts` for a freehand tool, `shapes.ts` for a previewed shape).
2. Add its id to `ToolId` in `src/engine/tools/types.ts` and register it in `src/engine/tools/index.ts`.
3. Add its icon, label and shortcut in `src/ui/tools.ts`, and its options in `src/ui/panels/ToolSection.tsx` if it has any.
4. Add the label and hint to the dictionaries in `src/i18n/`.
5. Write a test in `tests/editor.test.ts` that draws with it.

## Adding a language

1. Copy `src/i18n/fr.ts` to `src/i18n/xx.ts` and translate every value.
2. Register it in `src/i18n/index.ts` (`dictionaries` and `LOCALES`).

## Reporting bugs

Open an issue with the steps to reproduce, what you expected, and your browser. A `.baipix` file of the drawing helps a lot (main menu → Download as .baipix).

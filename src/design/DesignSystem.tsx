import { useEffect, useState, type ReactNode } from 'react';
import { pack } from '../engine/color';
import { Checkbox } from '../ui/components/Checkbox';
import { Icon } from '../ui/components/Icon';
import { IconButton } from '../ui/components/IconButton';
import { NumberField } from '../ui/components/NumberField';
import { Tooltips } from '../ui/components/Tooltips';
import { ICONS, type IconName } from '../ui/icons';
import { ColorRow } from '../ui/panels/ColorRow';
import { getTheme, setTheme, type ThemePreference } from '../ui/theme';
import { contrast } from './contrast';
import { download, LOGO_COLORS, logoPng, logoSvg } from './logo';
import { TOKENS, type Token } from './tokens';

const SECTIONS = [
  ['logo', 'Logo'],
  ['colors', 'Colors'],
  ['type', 'Type'],
  ['shapes', 'Shapes and shadows'],
  ['icons', 'Icons'],
  ['buttons', 'Buttons'],
  ['fields', 'Fields'],
  ['lists', 'Lists'],
  ['surfaces', 'Surfaces'],
  ['accessibility', 'Accessibility'],
] as const;

function Block({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="ds-block">
      <h2>{title}</h2>
      {intro && <p className="ds-intro">{intro}</p>}
      {children}
    </section>
  );
}

/** A component shown with a caption saying when to use it. */
function Specimen({ label, use, children }: { label: string; use: string; children: ReactNode }) {
  return (
    <div className="ds-specimen">
      <div className="ds-stage">{children}</div>
      <div className="ds-caption">
        <strong>{label}</strong>
        <span className="muted">{use}</span>
      </div>
    </div>
  );
}

function ThemeSwitch() {
  const [theme, set] = useState<ThemePreference>(getTheme());
  return (
    <div className="ds-theme" role="group" aria-label="Theme">
      {(['system', 'light', 'dark'] as const).map((t) => (
        <button
          key={t}
          type="button"
          className="btn"
          aria-pressed={theme === t}
          onClick={() => {
            setTheme(t);
            set(t);
          }}
        >
          {t[0].toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ logo */

function LogoBlock() {
  return (
    <Block
      id="logo"
      title="Logo"
      intro="A pixel escaping a 2×2 block, drawn on an 8×8 grid of 3×3 squares. It's the only brand mark: the name is set next to it in Inter Bold."
    >
      <div className="ds-logo-row">
        <div className="ds-logo-tile is-light">
          <Icon name="logo" size={96} />
        </div>
        <div className="ds-logo-tile is-dark">
          <Icon name="logo" size={96} />
        </div>
        <div className="ds-logo-tile is-blue">
          <Icon name="logo" size={96} />
        </div>
        <div className="ds-logo-tile ds-lockup">
          <Icon name="logo" size={40} />
          <span>Baipix</span>
        </div>
      </div>
      <div className="ds-downloads">
        {LOGO_COLORS.map((c) => (
          <div key={c.id} className="ds-download">
            <span className="ds-download-swatch" style={{ background: c.color }} />
            <strong>{c.label}</strong>
            <button
              type="button"
              className="btn"
              onClick={() => download(`baipix-logo-${c.id}.svg`, logoSvg(c.color))}
            >
              SVG
            </button>
            {[64, 256, 1024].map((size) => (
              <button
                key={size}
                type="button"
                className="btn"
                onClick={() =>
                  void logoPng(c.color, size).then((b) => download(`baipix-logo-${c.id}-${size}.png`, b))
                }
              >
                PNG {size}
              </button>
            ))}
          </div>
        ))}
      </div>
      <ul className="ds-rules">
        <li>
          Scale it by multiples of 8 px (16, 24, 32…) so every square lands on whole pixels. 16 px is the
          smallest size.
        </li>
        <li>Keep at least one square (3/8 of its height) of empty space around it.</li>
        <li>Black on light backgrounds, white on dark ones, blue only on dark or neutral ones.</li>
        <li>Don't rotate, stretch, outline, add a shadow or gradient, or smooth its edges.</li>
      </ul>
    </Block>
  );
}

/* ------------------------------------------------------------------ colors */

function Swatch({ token }: { token: Token }) {
  return (
    <div className="ds-swatch">
      <div className="ds-swatch-pair">
        <span className="ds-chip" style={{ colorScheme: 'light', background: `var(${token.name})` }} />
        <span className="ds-chip" style={{ colorScheme: 'dark', background: `var(${token.name})` }} />
      </div>
      <code>{token.name}</code>
      <span className="muted ds-value">{token.value}</span>
    </div>
  );
}

function ColorsBlock() {
  const colors = TOKENS.filter((t) => t.kind === 'color');
  const groups = [...new Set(colors.map((t) => t.group))];
  return (
    <Block
      id="colors"
      title="Colors"
      intro={
        <>
          Every color lives in <code>tokens.css</code> (and the blue in the pixel look of <code>app.css</code>
          ), written once for light and dark. Each chip shows the light value, then the dark one. This list is
          read from the stylesheets.
        </>
      }
    >
      {groups.map((g) => (
        <div key={g} className="ds-group">
          <h3>{g}</h3>
          <div className="ds-swatches">
            {colors
              .filter((t) => t.group === g)
              .map((t) => (
                <Swatch key={t.name} token={t} />
              ))}
          </div>
        </div>
      ))}
      <p className="ds-note">
        The interface stays neutral at rest. Blue (<code>--glow</code>) is only for interaction: hover, focus,
        the main button, what's selected or about to be acted on.
      </p>
    </Block>
  );
}

/* ------------------------------------------------------------------ type, shapes */

function TypeBlock() {
  return (
    <Block
      id="type"
      title="Type"
      intro="Inter everywhere, small and dense like a design tool. Numbers are tabular."
    >
      <div className="ds-type">
        <div style={{ font: '700 32px/40px var(--font)' }}>Welcome to Baipix · 32 Bold</div>
        <div style={{ font: '600 16px/24px var(--font)' }}>
          Insert coin, drop your first pixel · 16 Semibold
        </div>
        <div style={{ font: '400 14px/22px var(--font)' }}>Body text on the home screen · 14 Regular</div>
        <div style={{ font: '600 11px/16px var(--font)' }}>Section title · 11 Semibold</div>
        <div style={{ font: '400 11px/16px var(--font)' }}>Interface text, labels, menus · 11 Regular</div>
        <div className="muted" style={{ font: '400 11px/16px var(--font)' }}>
          Muted text, hints, sizes · 11 Regular
        </div>
      </div>
    </Block>
  );
}

function ShapesBlock() {
  return (
    <Block
      id="shapes"
      title="Shapes and shadows"
      intro="No rounded corners: controls lose their corner pixel (--notch), floating surfaces are notched blocks with a hard, unblurred shadow, and keys have a solid side they sink into."
    >
      <div className="ds-shapes">
        <Specimen label="Notched control" use="Fields, swatches, chips, thumbnails.">
          <span className="ds-notch" />
        </Specimen>
        <Specimen
          label="Floating surface"
          use="Panels, menus, toasts, home cards: a 2px ring and a hard shadow."
        >
          <span className="ds-surface" />
        </Specimen>
        <Specimen label="Key" use="Buttons: a solid side, pushed halfway on hover, all the way on press.">
          <button type="button" className="btn">
            Button
          </button>
        </Specimen>
      </div>
    </Block>
  );
}

/* ------------------------------------------------------------------ icons */

function IconsBlock() {
  const names = Object.keys(ICONS) as IconName[];
  return (
    <Block
      id="icons"
      title="Icons"
      intro="Pixelarticons (MIT) on a 12×12 grid, plus a few drawn by hand on the same grid when it has none. Sizes are multiples of 6 px (12, 18, 24) so each icon pixel lands on whole device pixels."
    >
      <div className="ds-icons">
        {names.map((n) => (
          <div key={n} className="ds-icon">
            <div className="ds-icon-sizes">
              <Icon name={n} size={12} />
              <Icon name={n} size={18} />
              <Icon name={n} size={24} />
            </div>
            <code>{n}</code>
          </div>
        ))}
      </div>
    </Block>
  );
}

/* ------------------------------------------------------------------ components */

function ButtonsBlock() {
  return (
    <Block id="buttons" title="Buttons" intro="Hover and press them to see their states.">
      <div className="ds-grid">
        <Specimen label="Button" use="Actions in panels and dialogs. Neutral, it only sinks on hover.">
          <button type="button" className="btn">
            Export
          </button>
          <button type="button" className="btn" disabled>
            Disabled
          </button>
        </Specimen>
        <Specimen label="Primary button" use="The one main action of a panel or dialog. Blue at rest.">
          <button type="button" className="btn btn-primary">
            Create
          </button>
        </Specimen>
        <Specimen label="Action button" use="Big actions on full screens (home). Chunkier, bold, deep side.">
          <button type="button" className="action-btn is-primary">
            <Icon name="plus" size={12} />
            Create
          </button>
          <button type="button" className="action-btn">
            Import
          </button>
        </Specimen>
        <Specimen
          label="Icon button"
          use="Compact actions with a tooltip. Always has a label for screen readers."
        >
          <IconButton icon="plus" label="New layer" />
          <IconButton icon="eye" label="Hide" />
          <IconButton icon="trash" label="Delete" />
          <IconButton icon="more" label="More" />
        </Specimen>
        <Specimen label="Tool button" use="The toolbar. The active tool is a key held down.">
          <div className="ds-toolbar">
            <IconButton className="tool-btn" icon="move" iconSize={24} label="Move" shortcut="V" />
            <IconButton
              className="tool-btn"
              icon="pencil"
              iconSize={24}
              label="Pencil"
              shortcut="B"
              pressed
            />
            <IconButton className="tool-btn" icon="eraser" iconSize={24} label="Eraser" shortcut="E" />
          </div>
        </Specimen>
      </div>
    </Block>
  );
}

function ColorDemo() {
  const [color, setColor] = useState(pack(102, 196, 255));
  return (
    <div className="ds-color">
      <ColorRow slot="primary" color={color} onChange={setColor} />
    </div>
  );
}

function SegmentedDemo() {
  const [round, setRound] = useState(false);
  return (
    <div className="button-group" role="group" aria-label="Brush tip">
      <IconButton icon="rect" label="Square tip" pressed={!round} onClick={() => setRound(false)} />
      <IconButton icon="ellipse" label="Round tip" pressed={round} onClick={() => setRound(true)} />
    </div>
  );
}

function FieldsBlock() {
  const [n, setN] = useState(64);
  const [checked, setChecked] = useState(true);
  return (
    <Block id="fields" title="Fields">
      <div className="ds-grid">
        <Specimen label="Number field" use="Drag its label to scrub the value, or type it.">
          <div className="ds-field">
            <NumberField value={n} min={1} max={512} label="W" ariaLabel="Width" onChange={(v) => setN(v)} />
          </div>
        </Specimen>
        <Specimen
          label="Color row"
          use="A color: the swatch opens the picker, then its hex code and its opacity (drag ◐ to scrub)."
        >
          <ColorDemo />
        </Specimen>
        <Specimen label="Checkbox" use="On/off settings. A notched square with a pixel tick.">
          <Checkbox checked={checked} onChange={setChecked} label="Pixel grid" />
        </Specimen>
        <Specimen
          label="Segmented icon buttons"
          use="One choice among a few, shown as icons (the brush tip: square or round). The chosen one is held down."
        >
          <SegmentedDemo />
        </Specimen>
        <Specimen label="Chip" use="Quick presets, like canvas sizes.">
          <div className="chips">
            <button type="button" className="chip" aria-pressed="true">
              32 × 32
            </button>
            <button type="button" className="chip">
              64 × 64
            </button>
          </div>
        </Specimen>
      </div>
    </Block>
  );
}

function ListsBlock() {
  const row = (name: string, aside: string, state = '') => (
    <div className={`item${state}`}>
      <span className="thumb" />
      <span className="item-name">{name}</span>
      <span className="muted">{aside}</span>
      <span className="item-actions">
        <IconButton icon="unlock" className="icon-btn item-action item-lock" label="Lock" />
        <IconButton icon="eye" className="icon-btn item-action" label="Hide" />
      </span>
    </div>
  );
  return (
    <Block
      id="lists"
      title="Lists"
      intro="File and layer rows. The name uses the whole row and is cut with an ellipsis; the icons float over its end on hover."
    >
      <div className="ds-list item-list">
        {row('Background', '')}
        {row('Character, with a name long enough to be cut', '50 %', ' is-active')}
        {row('Hidden layer', '', ' is-hidden')}
      </div>
    </Block>
  );
}

function TabsDemo() {
  const [tab, setTab] = useState('colors');
  return (
    <div className="panel-tabs ds-tabs" role="tablist" aria-label="Adjustments">
      {[
        ['colors', 'Colors'],
        ['remap', 'Remap'],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          className="panel-tab"
          onClick={() => setTab(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SurfacesBlock() {
  return (
    <Block id="surfaces" title="Surfaces">
      <div className="ds-grid">
        <Specimen label="Menu" use="Right-click and … menus. Blue on hover.">
          <div className="menu ds-static" role="menu">
            <button type="button" className="menu-item" role="menuitem">
              Duplicate
            </button>
            <button type="button" className="menu-item" role="menuitem">
              Download as .baipix
            </button>
            <div className="menu-separator" />
            <button type="button" className="menu-item" role="menuitem" disabled>
              Delete
            </button>
          </div>
        </Specimen>
        <Specimen label="Toast" use="Short feedback at the bottom, inverted, with at most one action (Undo).">
          <div className="toast is-visible ds-static">
            Layer deleted.
            <button type="button" className="toast-action">
              Undo
            </button>
          </div>
        </Specimen>
        <Specimen
          label="Tabs"
          use="Kinds of content in one panel (Design / Export, the Adjustments). The current one is underlined in blue."
        >
          <TabsDemo />
        </Specimen>
        <Specimen label="Tooltip" use="On hover of any element with data-tip. Dark in both themes.">
          <button type="button" className="btn" data-tip="A tooltip" data-kbd="⌘K">
            Hover me
          </button>
        </Specimen>
      </div>
    </Block>
  );
}

/* ------------------------------------------------------------------ accessibility */

const PAIRS: [string, string, string, number][] = [
  ['Text on panels', '--text', '--panel', 4.5],
  ['Muted text on panels', '--muted', '--panel', 4.5],
  ['Text on the canvas', '--text', '--canvas', 4.5],
  ['Muted text on the canvas', '--muted', '--canvas', 4.5],
  ['Muted text on blue (hover)', '--glow-muted', '--glow', 4.5],
  ['Menu text', '--menu-text', '--menu-bg', 4.5],
  ['Menu shortcuts', '--menu-shortcut', '--menu-bg', 4.5],
  ['Ink on blue', '--glow-ink', '--glow', 4.5],
  ['Accent ink on accent', '--accent-ink', '--accent', 4.5],
  ['Toast text', '--toast-text', '--toast-bg', 4.5],
  ['Tooltip text', '--tooltip-text', '--tooltip-bg', 4.5],
  ['Blue lines on panels', '--glow-line', '--panel', 3],
];

function ContrastTable() {
  const [rows, setRows] = useState<{ label: string; light: number; dark: number; min: number }[]>([]);
  useEffect(() => {
    // Let the browser resolve light-dark() under each color scheme, then measure.
    const measure = (scheme: 'light' | 'dark', fg: string, bg: string) => {
      const el = document.createElement('span');
      el.style.colorScheme = scheme;
      el.style.color = `var(${fg})`;
      el.style.backgroundColor = `var(${bg})`;
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      const ratio = contrast(cs.color, cs.backgroundColor);
      el.remove();
      return ratio;
    };
    setRows(
      PAIRS.map(([label, fg, bg, min]) => ({
        label,
        light: measure('light', fg, bg),
        dark: measure('dark', fg, bg),
        min,
      })),
    );
  }, []);
  const cell = (v: number, min: number) => (
    <td className={v >= min ? 'is-pass' : 'is-fail'}>
      {v.toFixed(1)} {v >= min ? '✓' : '✗'}
    </td>
  );
  return (
    <table className="ds-table">
      <thead>
        <tr>
          <th>Pair</th>
          <th>Needs</th>
          <th>Light</th>
          <th>Dark</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td>{r.label}</td>
            <td className="muted">{r.min}:1</td>
            {cell(r.light, r.min)}
            {cell(r.dark, r.min)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AccessibilityBlock() {
  return (
    <Block
      id="accessibility"
      title="Accessibility"
      intro="Contrast is measured live from the tokens (WCAG AA: 4.5:1 for text, 3:1 for lines and controls)."
    >
      <ContrastTable />
      <ul className="ds-rules">
        <li>Every icon button has a label (aria-label and tooltip).</li>
        <li>Focus is always visible: a 2px blue outline (--glow-line).</li>
        <li>Animations are turned off with “reduce motion”.</li>
        <li>Touch targets are at least 44 px on tablets and phones (to do with the tablet layout).</li>
        <li>Everything in the panels can be reached with the keyboard (to do, #33).</li>
      </ul>
    </Block>
  );
}

export function DesignSystem() {
  return (
    <div className="ds">
      <header className="ds-header">
        <a href="#top" className="ds-brand">
          <Icon name="logo" size={24} />
          <span>Baipix design system</span>
        </a>
        <ThemeSwitch />
      </header>
      <div className="ds-body">
        <nav className="ds-nav" aria-label="Sections">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
          <a href="./" className="muted">
            Open the editor →
          </a>
        </nav>
        <main className="ds-main" id="top">
          <LogoBlock />
          <ColorsBlock />
          <TypeBlock />
          <ShapesBlock />
          <IconsBlock />
          <ButtonsBlock />
          <FieldsBlock />
          <ListsBlock />
          <SurfacesBlock />
          <AccessibilityBlock />
        </main>
      </div>
      <Tooltips />
    </div>
  );
}

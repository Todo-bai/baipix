import { useEffect, useRef, useState } from 'react';
import { alpha, toCss } from '../../engine/color';
import { flatten } from '../../engine/composite';
import { useT } from '../../i18n';
import { useEditor } from '../EditorContext';
import { Section } from '../components/Section';
import { checkerPattern, readTheme } from '../render/theme';

/** Small live preview of the artwork, including the render gap. */
export function PreviewSection() {
  const t = useT();
  const editor = useEditor();
  const ref = useRef<HTMLCanvasElement>(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = 0;
      const canvas = ref.current;
      if (!canvas) return;
      const { doc } = editor.getLive();
      const dpr = window.devicePixelRatio || 1;
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      const ctx = canvas.getContext('2d')!;
      const theme = readTheme();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = theme.canvas;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const k = Math.floor(Math.min((canvas.width - 16) / doc.width, (canvas.height - 16) / doc.height));
      const f = k >= 1 ? k : Math.min((canvas.width - 16) / doc.width, (canvas.height - 16) / doc.height);
      const w = doc.width * f;
      const h = doc.height * f;
      const x = Math.round((canvas.width - w) / 2);
      const y = Math.round((canvas.height - h) / 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = checkerPattern(ctx, Math.max(3, Math.round(5 * dpr)), theme.checkA, theme.checkB);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      const hasBg = doc.backgroundVisible && alpha(doc.background) > 0;
      if (hasBg) {
        ctx.fillStyle = toCss(doc.background);
        ctx.fillRect(x, y, w, h);
      }
      const { gap, pixelSize } = doc.render;
      const pixels = flatten(doc, { includeBackground: false });
      if (gap > 0 && k >= 3 && doc.width * doc.height <= 16384) {
        const gp = Math.max(1, Math.round((k * gap) / (pixelSize + gap)));
        const size = Math.max(1, k - gp);
        for (let py = 0; py < doc.height; py++)
          for (let px = 0; px < doc.width; px++) {
            const c = pixels[py * doc.width + px];
            if (!alpha(c)) continue;
            ctx.fillStyle = toCss(c);
            ctx.fillRect(x + px * k, y + py * k, size, size);
          }
        setLabel(t('preview.gap', { gap }));
      } else {
        const src = document.createElement('canvas');
        src.width = doc.width;
        src.height = doc.height;
        const sctx = src.getContext('2d')!;
        const image = sctx.createImageData(doc.width, doc.height);
        new Uint32Array(image.data.buffer).set(pixels);
        sctx.putImageData(image, 0, 0);
        ctx.drawImage(src, x, y, w, h);
        setLabel(k >= 1 ? `${k}×` : t('preview.reduced'));
      }
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    request();
    const off = editor.onPixels(request);
    const ro = new ResizeObserver(request);
    if (ref.current) ro.observe(ref.current);
    return () => {
      off();
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [editor, t]);

  return (
    <Section title={t('section.preview')} aside={<span className="muted">{label}</span>}>
      <div className="preview">
        <canvas ref={ref} />
      </div>
    </Section>
  );
}

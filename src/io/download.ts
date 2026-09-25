/**
 * Saves a file for the user. Uses the host's download bridge when Baipix runs embedded
 * (e.g. published as a Claude artifact), otherwise a classic download link.
 */
interface DownloadsBridge {
  save(file: { filename: string; data: Blob | string }): Promise<unknown>;
}

declare global {
  interface Window {
    claude?: { use?: (name: string) => Promise<unknown> };
  }
}

let bridge: Promise<DownloadsBridge | null> | null = null;

function getBridge(): Promise<DownloadsBridge | null> {
  if (!window.claude?.use) return Promise.resolve(null);
  bridge ??= Promise.race([
    window.claude.use('downloads') as Promise<DownloadsBridge | null>,
    new Promise<null>((r) => setTimeout(() => r(null), 4000)),
  ]).catch(() => null);
  return bridge;
}

export type SaveResult = 'saved' | 'cancelled' | 'busy';

export async function saveFile(
  filename: string,
  data: Blob | string,
  mime = 'application/octet-stream',
): Promise<SaveResult> {
  const host = await getBridge();
  if (host) {
    try {
      await host.save({ filename, data });
      return 'saved';
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'declined') return 'cancelled';
      if (code === 'rate_limited') return 'busy';
      // Any other failure: fall back to a regular download below.
    }
  }
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}

export const safeFileName = (name: string): string =>
  name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 80) || 'pixel-art';

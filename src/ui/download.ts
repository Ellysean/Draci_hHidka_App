// Stažení a sdílení souboru z prohlížeče (Fáze 8). Bez serveru – Blob + <a download>.

type DownloadsNs = { save(r: { filename: string; data: string | Blob }): Promise<{ status: string }> } | null;
type ClaudeWin = { claude?: { use?: (name: string) => Promise<unknown> } };

/**
 * Sdílený artifact na claude.ai nesmí stahovat přímo – soubor nabídne přes
 * capability `downloads` (divák potvrdí). Mimo artifact `window.claude` není → Blob.
 */
let downloadsNs: Promise<DownloadsNs> | null = null;
function artifactDownloads(): Promise<DownloadsNs> | null {
  const w = (typeof window !== 'undefined' ? window : undefined) as (Window & ClaudeWin) | undefined;
  if (!w?.claude?.use) return null;
  downloadsNs ??= w.claude.use('downloads').then((x) => (x as DownloadsNs) ?? null, () => null);
  return downloadsNs;
}
// Načíst dopředu, ať je při kliknutí připravené.
artifactDownloads();

function blobDownload(fileName: string, text: string, type: string) {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** true = soubor předán ke stažení, false = divák odmítl / nejde. */
export async function downloadText(fileName: string, text: string, type = 'application/json'): Promise<boolean> {
  const ns = artifactDownloads();
  if (ns) {
    const dl = await ns;
    if (dl) {
      try { await dl.save({ filename: fileName, data: text }); return true; } catch { return false; }
    }
  }
  blobDownload(fileName, text, type);
  return true;
}

/** Umí prohlížeč sdílet soubor (Android/iOS: Disk, e-mail, chat…)? */
export function canShareFile(): boolean {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare || typeof File === 'undefined') return false;
    // Ve vloženém artifactu (claude.ai) sdílení soubor neprojde – nabízí se jen stažení.
    if ((window as Window & ClaudeWin).claude?.use) return false;
    return navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] });
  } catch {
    return false;
  }
}

/** true = sdíleno, false = uživatel zrušil / nejde. */
export async function shareText(fileName: string, text: string, title: string): Promise<boolean> {
  try {
    const file = new File([text], fileName, { type: 'application/json' });
    await navigator.share({ files: [file], title });
    return true;
  } catch {
    return false;
  }
}

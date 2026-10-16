// Stránka ZÁLOHA (Fáze 8): export postavy do souboru, import ze souboru,
// automatické zálohy v prohlížeči, nová / prázdná / ukázková postava.
import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { newCharacter } from '../model/defaults';
import { sampleKloi } from '../model/sample';
import type { Character } from '../model/types';
import { useStore } from '../state/store';
import {
  agoText, daysSinceExport, MAX_SNAPSHOTS, describe, exportFileName, exportJson, isBlank, listSnapshots, loadSettings, markExported,
  parseImport, removeSnapshot, restoreSnapshot, SNAPSHOT_REASON, type ImportResult, type Snapshot, type SnapshotReason,
} from '../storage/backup';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { canShareFile, downloadText, shareText } from '../ui/download';
import { Icon } from '../ui/Icon';
import { Ribbon } from '../ui/Ribbon';
import { Sheet } from '../ui/Sheet';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const when = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('cs', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

type Ok = Extract<ImportResult, { ok: true }>;

/** Co čeká na potvrzení – import ze souboru, obnova zálohy, ukázka, prázdný deník. */
type Pending =
  | { kind: 'import'; result: Ok; fileName: string }
  | { kind: 'obnova'; result: Ok; snap: Snapshot }
  | { kind: 'ukazka' }
  | { kind: 'prazdna' }
  | { kind: 'smazat'; snap: Snapshot };

export function Zaloha() {
  const { character: c, replaceWith, storage } = useStore();
  const [settings, setSettings] = useState(() => loadSettings(storage));
  const [snaps, setSnaps] = useState(() => listSnapshots(storage));
  const [pending, setPending] = useState<Pending | null>(null);
  const [saveFirst, setSaveFirst] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: ReactNode } | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const share = useMemo(canShareFile, []);
  const blank = isBlank(c);
  const days = daysSinceExport(c, settings);

  const refresh = () => { setSettings(loadSettings(storage)); setSnaps(listSnapshots(storage)); };

  const doExport = async (ch: Character = c) => {
    const ok = await downloadText(exportFileName(ch), exportJson(ch, __APP_VERSION__));
    if (ok && ch.id === c.id) markExported(ch, storage);
    if (!ok) setMsg({ ok: false, text: 'Soubor zálohy se nepodařilo stáhnout (stahování bylo odmítnuto nebo ho tohle prostředí nepovoluje). Postava zůstává uložená v prohlížeči.' });
    refresh();
    return ok;
  };
  const doShare = async () => {
    if (await shareText(exportFileName(c), exportJson(c, __APP_VERSION__), `Postava ${c.basic.name || ''}`.trim())) {
      markExported(c, storage);
      refresh();
    }
  };

  const readFile = async (f: File | undefined) => {
    setMsg(null);
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) { setMsg({ ok: false, text: 'Soubor je příliš velký – záloha postavy má obvykle desítky kB.' }); return; }
    const r = parseImport(await f.text(), c);
    if (!r.ok) { setMsg({ ok: false, text: <>Soubor <b>{f.name}</b> nejde načíst: {r.message}</> }); return; }
    setSaveFirst(!blank && days !== 0);
    setPending({ kind: 'import', result: r, fileName: f.name });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void readFile(e.dataTransfer.files?.[0]);
  };

  const replace = async (next: Character, reason: SnapshotReason, text: ReactNode) => {
    if (saveFirst && !blank && reason !== 'obnova') await doExport(c);
    replaceWith(next, reason);
    setPending(null);
    refresh();
    setMsg({ ok: true, text });
  };

  const confirm = () => {
    if (!pending) return;
    switch (pending.kind) {
      case 'import':
        return void replace(pending.result.character, 'import', <>Načtena postava <b>{describe(pending.result.info)}</b>. <a href="#/postava">Otevřít deník →</a></>);
      case 'obnova':
        return void replace(pending.result.character, 'obnova', <>Obnovena postava <b>{describe(pending.result.info)}</b>. <a href="#/postava">Otevřít deník →</a></>);
      case 'ukazka':
        return void replace(sampleKloi(), 'ukazka', <>Načtena ukázková postava Kloi. <a href="#/postava">Otevřít deník →</a></>);
      case 'prazdna':
        return void replace(newCharacter(), 'nova', <>Deník je prázdný – vyplň ho na záložce <a href="#/postava">Postava</a>.</>);
      case 'smazat':
        removeSnapshot(pending.snap.uid, storage);
        setPending(null);
        refresh();
        return;
    }
  };

  const askRestore = (s: Snapshot) => {
    const r = restoreSnapshot(s);
    if (!r.ok) { setMsg({ ok: false, text: <>Zálohu nejde obnovit: {r.message} Můžeš ji stáhnout a poslat k opravě.</> }); return; }
    setPending({ kind: 'obnova', result: r, snap: s });
  };

  const current = blank ? 'prázdný deník' : describe({ name: c.basic.name, raceId: c.basic.raceId, classId: c.basic.classId, level: c.progression.level });

  const saveFirstBox = !blank && (
    <label className="zl-check">
      <input type="checkbox" checked={saveFirst} onChange={(e) => setSaveFirst(e.target.checked)} />
      Nejdřív stáhnout zálohu současné postavy do souboru
    </label>
  );

  return (
    <div className="stack zl-page">
      <div className="wiz-head">
        <div><Ribbon icon="chest">ZÁLOHA A IMPORT</Ribbon><h1 className="pg">Záloha postavy</h1></div>
        <a className="btn" href="#/postava">← Zpět do deníku</a>
      </div>

      {msg && (
        <div className={msg.ok ? 'zl-msg ok' : 'banner'} role={msg.ok ? 'status' : 'alert'}>
          <span>{msg.text}</span>
          <button type="button" className="btn" onClick={() => setMsg(null)}>OK</button>
        </div>
      )}

      <div className="cols">
        <div className="stack">
          <Sheet>
            <Ribbon icon="download">ULOŽIT DO SOUBORU</Ribbon>
            <p className="zl-cur">V deníku: <b>{current}</b><br />
              <span className="small muted">Naposledy upraveno {when(c.meta.updatedAt)}</span></p>
            <p className="small">
              Postava se průběžně ukládá jen <b>do tohoto prohlížeče</b>. Když se vymažou data prohlížeče, přeinstaluje se
              telefon nebo chceš hrát na jiném zařízení, potřebuješ <b>soubor zálohy</b> (.json). Ulož si ho na disk, OneDrive /
              Google Disk nebo si ho pošli e-mailem.
            </p>
            <div className={`zl-last${!blank && (days == null || days > 7) ? ' warn' : ''}`}>
              {blank ? 'Prázdný deník není co zálohovat.' : days == null ? 'Tahle postava ještě nebyla zálohovaná do souboru.' : `Poslední záloha do souboru: ${agoText(days)}.`}
            </div>
            <div className="zl-btns">
              <button type="button" className="btn dark" disabled={blank} onClick={() => void doExport()}><Icon name="download" />Stáhnout zálohu</button>
              {share && <button type="button" className="btn" disabled={blank} onClick={() => void doShare()}><Icon name="upload" />Sdílet…</button>}
              <a className="btn" href="#/tisk"><Icon name="print" />Tisk / PDF</a>
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>Soubor: {exportFileName(c)}</p>
          </Sheet>

          <Sheet>
            <Ribbon icon="upload">NAČÍST ZE SOUBORU</Ribbon>
            <div
              className={`zl-drop${drag ? ' on' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
            >
              <p>Vyber soubor zálohy (.json) – třeba z jiného zařízení nebo od spoluhráče.<span className="zl-desk"> Nebo ho sem přetáhni.</span></p>
              <button type="button" className="btn dark" onClick={() => fileRef.current?.click()}><Icon name="upload" />Vybrat soubor…</button>
              <input ref={fileRef} type="file" accept=".json,application/json" hidden
                onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Načtená postava <b>nahradí</b> tu současnou (appka drží jednu postavu). Současná se předtím sama uloží do
              záloh v prohlížeči níže, takže jde vrátit. Zálohy ze starších verzí appky se doplní automaticky.
            </p>
          </Sheet>
        </div>

        <div className="stack">
          <Sheet>
            <Ribbon icon="hourglass">ZÁLOHY V PROHLÍŽEČI</Ribbon>
            <p className="small">Automaticky před každým nahrazením postavy (import, nová postava, ukázka, obnova). Drží se posledních {MAX_SNAPSHOTS}.</p>
            {snaps.length === 0 ? <p className="muted small">Zatím žádné.</p> : (
              <ul className="zl-snaps">
                {snaps.map((s) => (
                  <li key={s.uid}>
                    <div>
                      <b>{s.info ? describe(s.info) : 'Nečitelná data'}</b>
                      <span className="small muted">{when(s.at)} · {SNAPSHOT_REASON[s.reason] ?? s.reason}</span>
                    </div>
                    <div className="zl-sbtn">
                      {s.info && <button type="button" className="btn" onClick={() => askRestore(s)}>Obnovit</button>}
                      <button type="button" className="btn" aria-label="Stáhnout zálohu" title="Stáhnout"
                        onClick={() => {
                          const r = s.info ? restoreSnapshot(s) : null;
                          if (r?.ok) void downloadText(exportFileName(r.character, new Date(s.at)), exportJson(r.character, __APP_VERSION__));
                          else void downloadText(`DH-poskozena-data-${s.at.slice(0, 10)}.json`, s.data);
                        }}><Icon name="download" /></button>
                      <button type="button" className="fpop-x" aria-label="Smazat zálohu" onClick={() => setPending({ kind: 'smazat', snap: s })}>×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Sheet>

          <Sheet>
            <Ribbon icon="plus">NOVÁ POSTAVA</Ribbon>
            <div className="zl-new">
              <a className="btn wine" href="#/tvorba"><Icon name="plus" />Průvodce tvorbou</a>
              <span className="small">Krok za krokem podle pravidel (rasa, povolání, atributy, dovednosti, vybavení).</span>
              <button type="button" className="btn" onClick={() => { setSaveFirst(!blank && days !== 0); setPending({ kind: 'prazdna' }); }}>Prázdný deník</button>
              <span className="small">Pro přepsání rozehrané postavy z papíru – vše se vyplní ručně.</span>
              <button type="button" className="btn" onClick={() => { setSaveFirst(!blank && days !== 0); setPending({ kind: 'ukazka' }); }}>Ukázka: Kloi</button>
              <span className="small">Hotová postava na vyzkoušení appky (gnómí alchymistka, 3. úroveň).</span>
            </div>
          </Sheet>
        </div>
      </div>

      {pending?.kind === 'import' && (
        <ConfirmDialog title="NAČÍST POSTAVU" icon="upload" yes="Načíst a nahradit" onYes={confirm} onNo={() => setPending(null)}>
          <ImportPreview r={pending.result} fileName={pending.fileName} />
          {!blank && <p>Současná postava <b>{current}</b> bude nahrazena.</p>}
          {saveFirstBox}
        </ConfirmDialog>
      )}
      {pending?.kind === 'obnova' && (
        <ConfirmDialog title="OBNOVIT ZÁLOHU" icon="hourglass" yes="Obnovit" onYes={confirm} onNo={() => setPending(null)}>
          <ImportPreview r={pending.result} />
          <p className="small muted">Záloha z {when(pending.snap.at)} ({SNAPSHOT_REASON[pending.snap.reason]}).</p>
          {!blank && <p>Současná postava <b>{current}</b> se uloží mezi zálohy v prohlížeči.</p>}
        </ConfirmDialog>
      )}
      {pending?.kind === 'ukazka' && (
        <ConfirmDialog title="UKÁZKOVÁ POSTAVA" icon="person" yes="Načíst Kloi" onYes={confirm} onNo={() => setPending(null)}>
          <p>Načíst ukázkovou postavu Kloi?{!blank && <> Současná postava <b>{current}</b> bude nahrazena (uloží se mezi zálohy v prohlížeči).</>}</p>
          {saveFirstBox}
        </ConfirmDialog>
      )}
      {pending?.kind === 'prazdna' && (
        <ConfirmDialog title="PRÁZDNÝ DENÍK" icon="plus" yes="Vyprázdnit deník" onYes={confirm} onNo={() => setPending(null)}>
          <p>Začít s prázdným deníkem?{!blank && <> Současná postava <b>{current}</b> bude nahrazena (uloží se mezi zálohy v prohlížeči).</>}</p>
          {saveFirstBox}
        </ConfirmDialog>
      )}
      {pending?.kind === 'smazat' && (
        <ConfirmDialog title="SMAZAT ZÁLOHU" icon="skull" yes="Smazat" onYes={confirm} onNo={() => setPending(null)}>
          <p>Smazat zálohu <b>{pending.snap.info ? describe(pending.snap.info) : 'nečitelná data'}</b> z {when(pending.snap.at)}? Nejde to vrátit.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function ImportPreview({ r, fileName }: { r: Ok; fileName?: string }) {
  return (
    <div className="zl-prev">
      <b className="zl-name">{describe(r.info)}</b>
      <dl>
        <dt>Zkušenosti</dt><dd>{r.info.experience.toLocaleString('cs')}</dd>
        <dt>Naposledy upraveno</dt><dd>{when(r.info.updatedAt)}</dd>
        {r.exportedAt && <><dt>Záloha vytvořena</dt><dd>{when(r.exportedAt)}{r.appVersion ? ` · appka ${r.appVersion}` : ''}</dd></>}
        {fileName && <><dt>Soubor</dt><dd className="zl-file">{fileName}</dd></>}
      </dl>
      {r.warnings.map((w) => <p key={w} className="zl-warn">⚠ {w}</p>)}
    </div>
  );
}

// canvascore-frontend/src/session/hooks.js
// Hook React sottili: tutta la logica sta nei moduli puri (draftTrackers.js), testati in Node.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { createEditorDraftTracker, createDraftChannel } from './draftTrackers';
import { registerFlusher } from './drafts';

// Editor a blocchi: traccia il lavoro non salvato e lo copia nel backup locale.
// Restituisce { markSaved, discard }: markSaved va chiamato dopo OGNI salvataggio riuscito.
export function useEditorDraft() {
  const trackerRef = useRef(null);
  const [api] = useState(() => ({
    markSaved: () => { if (trackerRef.current) trackerRef.current.markSaved(); },
    discard: () => { if (trackerRef.current) trackerRef.current.discard(); },
  }));
  useEffect(() => {
    const tracker = createEditorDraftTracker({ getState: useStore.getState, setState: useStore.setState });
    trackerRef.current = tracker;
    tracker.start();
    const unsub = useStore.subscribe((s, prev) => tracker.onChange(s, prev));
    const unreg = registerFlusher(() => tracker.evaluate());   // anche alla scadenza / chiusura scheda
    return () => { unsub(); unreg(); tracker.dispose(); trackerRef.current = null; };
  }, []);
  return api;
}

// Viste con stato locale (menu, impostazioni): confronta col valore del server e salva il backup.
//   draft.loaded(valoreDalServer) -> eventuale bozza da riapplicare | null
//   draft.saved(valore)           -> dopo un salvataggio riuscito
//   draft.discard()               -> scarta la bozza, restituisce il valore del server
export function useDraftSync(scope, value) {
  const [ch] = useState(() => createDraftChannel(scope, {
    onBackupStatus: (ok) => { if (useStore.getState().draftBackupFailed === ok) useStore.setState({ draftBackupFailed: !ok }); },
  }));
  useEffect(() => { ch.update(value); }, [ch, value]);
  useEffect(() => {
    const unreg = registerFlusher(() => ch.flush());
    return () => { unreg(); ch.flush(); };
  }, [ch]);
  return ch;
}

// canvascore-frontend/src/session/hooks.js
// Thin React hooks: all the logic lives in the pure modules (draftTrackers.js), tested in Node.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { createEditorDraftTracker, createDraftChannel } from './draftTrackers';
import { registerFlusher } from './drafts';

// Block editor: tracks unsaved work and copies it to the local backup.
// Returns { markSaved, discard }: markSaved must be called after EVERY successful save.
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
    const unreg = registerFlusher(() => tracker.evaluate());   // also on expiry / tab close
    return () => { unsub(); unreg(); tracker.dispose(); trackerRef.current = null; };
  }, []);
  return api;
}

// Views with local state (menu, settings): compares with the server value and saves the backup.
//   draft.loaded(serverValue) -> draft to re-apply, if any | null
//   draft.saved(value)        -> after a successful save
//   draft.discard()           -> discards the draft, returns the server value
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

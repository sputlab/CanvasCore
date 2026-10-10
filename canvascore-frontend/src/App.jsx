import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { getSession } from './session/runtime';
import { purgeOldDrafts } from './session/drafts';
import VisualEditor from './components/VisualEditor';
import PageManager from './components/PageManager';
import MenuBuilder from './components/MenuBuilder';
import MediaManager from './components/MediaManager';
import GlobalSettings from './components/GlobalSettings';
import UserManager from './components/UserManager';
import Templates from './components/Templates';
import Submissions from './components/Submissions';
import Collections from './components/Collections';
import Login from './components/Login';
import ForcePasswordChange from './components/ForcePasswordChange';
import SessionExpiredOverlay from './components/SessionExpiredOverlay';
import SessionWarning from './components/SessionWarning';
import DraftRestorePrompt from './components/DraftRestorePrompt';

export default function App() {
  const { currentView, isAuthenticated, checkAuth, userRole, mustChangePw, fetchVersion, sessionExpired, sessionWarning } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = 'Inter, system-ui, sans-serif';
    document.body.style.backgroundColor = '#0f172a';

    fetchVersion();
    checkAuth().then(() => setLoading(false));
  }, [checkAuth]);

  // Il gestore di sessione lavora finche' si e' autenticati (anche a login-overlay mostrato).
  useEffect(() => {
    const session = getSession();
    if (isAuthenticated) { session.start(); purgeOldDrafts(); } else { session.stop(); }
  }, [isAuthenticated]);

  if (loading) return <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}></div>;
  if (!isAuthenticated) return <Login />;
  if (mustChangePw) return <ForcePasswordChange />;

  let view = <PageManager />;
  if (currentView === 'editor') view = <VisualEditor />;
  else if (currentView === 'menu') view = <MenuBuilder />;
  else if (currentView === 'media') view = <MediaManager />;
  else if (currentView === 'settings') view = <GlobalSettings />;
  else if (currentView === 'users' && userRole === 'admin') view = <UserManager />;
  else if (currentView === 'templates') view = <Templates />;
  else if (currentView === 'submissions' && userRole === 'admin') view = <Submissions />;
  else if (currentView === 'collections') view = <Collections />;

  return (
    <>
      {/* Con la sessione scaduta l'app resta MONTATA (nessuno stato perso) ma inerte: il login e' sopra di essa. */}
      <div style={{ display: 'contents' }} inert={sessionExpired ? true : undefined} aria-hidden={sessionExpired ? true : undefined}>
        {view}
      </div>
      {sessionWarning && !sessionExpired && <SessionWarning />}
      {sessionExpired && <SessionExpiredOverlay />}
      <DraftRestorePrompt />
    </>
  );
}

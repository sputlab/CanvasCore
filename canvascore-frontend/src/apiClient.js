// canvascore-frontend/src/apiClient.js
// Installa la guardia sulle fetch dell'API: token CSRF automatico e gestione della sessione scaduta
// (login sopra l'app, riesecuzione delle richieste fallite, backup locale). Vedi src/session/.
import { installSession } from './session/runtime';

installSession();

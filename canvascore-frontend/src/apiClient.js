// canvascore-frontend/src/apiClient.js
// Installs the guard on API fetches: automatic CSRF token and expired-session handling
// (login on top of the app, retry of failed requests, local backup). See src/session/.
import { installSession } from './session/runtime';

installSession();

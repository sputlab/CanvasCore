# CanvasCore 0.8.1 — abilita/disabilita ed elimina Header/Footer

## File da SOSTITUIRE
Backend: `canvascore-admin/api.php`, `rebuild_all.php`, `version.json`
Frontend: `src/components/GlobalSettings.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Cosa cambia
In **Global Options** c'è una nuova sezione "Global Header & Footer" con, per
header e footer:
- un interruttore **Enabled** (se spento, quella parte non viene mostrata su
  nessuna pagina, ma i blocchi restano salvati);
- **Edit** (apre l'editor su quella parte);
- **Delete** (elimina tutti i blocchi di quella parte — era ciò che mancava).

Ricorda di salvare le Global Options dopo aver cambiato gli interruttori (il
salvataggio ripubblica il sito). Delete ripubblica automaticamente.

## Verificato
delete_part rimuove la parte; i flag enabled sopprimono correttamente il
rendering (default = mostrati). Build e lint verdi.

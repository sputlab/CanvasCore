# CanvasCore — Versioning (SemVer)

Tre versioni coordinate, un'unica fonte di verità: `canvascore-admin/version.json`.

```json
{
  "app": "0.1.0",        // versione del prodotto (MAJOR.MINOR.PATCH)
  "db_schema": 1,        // versione dello schema del database
  "content_schema": 1    // versione del formato dei blocchi salvati
}
```

- **PHP** legge `version.json` a runtime (`cc_version()` in `config.php`).
- **Vite** legge lo stesso file a build-time (`vite.config.js` → `__APP_VERSION__`),
  quindi interfaccia e server non possono divergere.
- Il pannello mostra la versione e avvisa se build e server non coincidono
  (segnale che va fatto un hard refresh dopo l'aggiornamento).
- Ogni pagina compilata riporta `<meta name="generator" content="CanvasCore x.y.z">`.

## File nuovi da aggiungere

- `canvascore-admin/version.json`
- `canvascore-admin/migrations.php`
- `CHANGELOG.md` (nella root del progetto)

## File da sostituire

Backend: `canvascore-admin/config.php`, `api.php`, `rebuild_all.php`
Frontend: `vite.config.js`, `src/App.jsx`, `src/store/useStore.js`,
`src/components/PageManager.jsx`  → poi `npm run build`.

## Come tagliare una release

1. Aggiorna `app` in `version.json` secondo SemVer:
   - **PATCH** (0.1.0 → 0.1.1): solo bugfix, nessun cambio di comportamento;
   - **MINOR** (0.1.0 → 0.2.0): nuove funzionalità retrocompatibili;
   - **MAJOR** (0.x → 1.0.0): quando l'API/i formati si stabilizzano, o per
     rotture incompatibili dopo l'1.0.
2. Sposta le voci da `[Unreleased]` a una nuova sezione datata nel `CHANGELOG`.
3. `npm run build` del frontend e deploy.

## Come aggiungere una migrazione DB

1. In `migrations.php`, aggiungi una voce numerata a `cc_db_migrations()`:
   ```php
   2 => function ($pdo) {
       cc_add_col($pdo, 'pages', 'nuovo_campo', "TEXT DEFAULT ''");
   },
   ```
   Usa sempre `cc_add_col()` (verifica l'esistenza, niente eccezioni) e, per
   SQLite, **niente default non costanti** in `ALTER` (es. `CURRENT_TIMESTAMP`):
   aggiungi la colonna senza default e backfilla con una `UPDATE`.
2. Porta `db_schema` in `version.json` al nuovo numero.
3. Annota la modifica nel `CHANGELOG`.

Il runner applica in ordine tutte le migrazioni con numero maggiore di quello
registrato in `cc_meta`, in transazione. Vale per installazioni nuove ed esistenti.

## Come aggiungere una migrazione dei contenuti (formato blocchi)

Quando in Fase 2 cambierà il formato dei blocchi:

1. In `migrations.php`, aggiungi a `cc_content_migrations()`:
   ```php
   2 => function ($blocks) {
       // trasforma l'array di blocchi dal formato 1 al formato 2
       return $blocks;
   },
   ```
2. Porta `content_schema` in `version.json` a `2`.
3. Al successivo caricamento del pannello, `cc_migrate_content()` aggiorna
   automaticamente il `content_json` di tutte le pagine e ne stampa la nuova
   versione. Le pagine salvate successivamente nascono già alla versione corrente.

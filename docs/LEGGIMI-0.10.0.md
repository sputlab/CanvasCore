# CanvasCore 0.10.0 — Blog: archivio, cover, lista, "show all"

## File da SOSTITUIRE
Backend: `canvascore-admin/api.php`, `compiler.php`, `migrations.php`,
`version.json`
Frontend: `src/components/PropertyPanel.jsx`, `VisualEditor.jsx`, `Collections.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Migrazione DB (automatica)
Schema → **v5** (colonna `collection_items.archived`). Si applica da sola.

## Le tue richieste, risolte
1. **Archivio**: ogni voce ha un flag **Archived**. Resta pubblicata/visitabile
   ma esce dalla lista principale. In Collections c'è il badge "archived" e un
   pulsante rapido archivia/ripristina. Nell'editor della voce, pannello
   **Item Settings**.
2. **Cover image** (e excerpt/data/stato/archived): si impostano ora nel pannello
   **Item Settings** dell'editor voce (con upload della cover).
3. **Lista invece di card**: opzione **Layout** = Grid / List nel Collection List.
4. **"Mostra tutti"**: opzione **Show all** (ignora il limite). Così su una pagina
   "Archivio" con Source=Archived + Show all vedi tutto lo storico; il limite
   serve per "ultimi N" (es. 3 in home).

## Perché NON un blocco ARCHIVE_LIST separato
Un unico **Collection List** con **Source** (Active / Archived / All) fa tutto:
un solo blocco da mantenere, più flessibile. La paginazione vera (/2, /3…) è un
possibile passo futuro, ma con "Show all" su una pagina archivio lo storico è
già interamente accessibile.

## Verificato
Migrazione v5, filtro per archived (active/archived/all), limit, show-all, layout
list. Build, lint (0 errori), parità verdi.

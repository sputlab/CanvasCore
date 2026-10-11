# CanvasCore 0.8.0 — Header/Footer globali

## File da SOSTITUIRE
Backend: `canvascore-admin/api.php`, `rebuild_all.php`, `migrations.php`,
`version.json`
Frontend: `src/components/VisualEditor.jsx`, `src/components/PageManager.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

## Migrazione DB (automatica)
Schema DB → **v3** (tabella `site_parts`). Si applica da sola al primo caricamento
del pannello. Verificata su DB nuovi ed esistenti.

## Come funziona
- Nella dashboard trovi due nuovi pulsanti: **Header** e **Footer**.
- Aprono l'editor a blocchi su quell'area globale: costruisci header e footer
  come costruisci una pagina (section, logo, menu secondario, colonne, testo…).
- Salvando e pubblicando, header e footer compaiono **su tutte le pagine**:
  l'header prima del contenuto, il footer dopo, a tutta larghezza.
- I blocchi "codice" (HTML/CSS custom) restano riservati agli admin anche qui.
- Export/Import del sito includono ora anche header e footer.

## Verificato
- Migrazione v3, endpoint save/get, rendering e ordine header→contenuto→footer,
  round-trip export/import. Build, lint (0 errori) e parità verdi.

## Prossime feature (come da tua lista)
blog/collezioni → revisioni pagina con rollback → nuovi blocchi (Accordion/Tabs,
Pricing, Gallery+lightbox) → breakpoint responsive per blocco.

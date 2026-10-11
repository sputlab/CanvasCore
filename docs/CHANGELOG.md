# Changelog

Tutte le modifiche rilevanti a CanvasCore sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/)
e il progetto adotta il [Versionamento Semantico](https://semver.org/lang/it/).

Finché la versione resta `0.x`, l'API e i formati possono cambiare tra una
minor e l'altra: `MINOR` segnala nuove funzionalità, `PATCH` correzioni.

## [Unreleased]

## [0.13.0] - 2026-10-07 — 12 nuovi blocchi

### Added
- **Divider**: linea, linea sfumata, puntini, onda/curva/diagonale (SVG, anche capovolte) e spaziatore.
- **Callout**: riquadro Info / Success / Warning / Danger / Note con titolo e testo ricco (sanificato).
- **Steps**: passi numerati in orizzontale (con connettori) o in verticale; su mobile diventa verticale.
- **Counters** (contatori animati): numeri che salgono quando entrano nello schermo. Il valore finale è già
  nell'HTML (utile senza JS e per i motori di ricerca); l'animazione rispetta `prefers-reduced-motion`.
- **Progress bars**: barre accessibili (`role="progressbar"`), colore per barra, riempimento all'ingresso.
- **Data table**: si incolla da Excel/Google Sheets (celle separate da `|` o Tab); intestazione, prima colonna
  come intestazione di riga, righe alternate, bordi, compatta, intestazione fissa con scroll; responsive.
- **Countdown**: ora locale del visitatore oppure fuso UTC fisso; messaggio finale o blocco nascosto;
  la data è leggibile anche senza JS (`<time>`).
- **Timeline**: verticale a sinistra o alternata (da 769 px in su).
- **Logo cloud**: griglia o fascia a scorrimento continuo (solo CSS, pausa al mouse, ferma con
  `prefers-reduced-motion`, serie duplicata nascosta a screen reader e tastiera), scala di grigi con colore su hover.
- **Team**: schede persona con foto o iniziali, ruolo, bio e link (email, LinkedIn, X, sito).
- **Before/After**: confronto con cursore trascinabile, accessibile da tastiera (`input range`);
  interattivo anche nel canvas dell'editor.
- **Business info**: indirizzo, telefono, email, sito, pulsante indicazioni (Google Maps), tabella orari e
  dati strutturati **schema.org LocalBusiness** (JSON-LD) per Google, con giorni e orari validati.
- Pannelli di configurazione per tutti i blocchi (riordino ↑/↓, aggiunta/rimozione voci, selettore media per
  logo, foto del team e immagini prima/dopo) e gruppo "CONTENT BLOCKS" nel pannello ADD.

### Changed
- Colori e numeri dei nuovi blocchi passano da validatori comuni a PHP e JS: solo valori CSS "sicuri"
  (niente `;`, `{}`, `url()`), numeri limitati a intervalli ragionevoli.
- I contatori usano un arrotondamento esplicito e identico in PHP e JS (né `number_format` né `toFixed`
  concordano su casi come 2,675): editor e sito mostrano sempre lo stesso numero.
- Il pannello proprietà legge il contenuto dallo store e non dalla copia dell'ultimo render: due modifiche
  ravvicinate non si sovrascrivono più a vicenda (difetto preesistente, trovato dai nuovi test).
- Il test di parità include i 12 blocchi (varianti e casi limite, default reali di `blocks.json`) e confronta
  anche il testo degli `<style>`.

### Notes
- Nessuna migrazione DB; `content_schema` invariato. Nessuna dipendenza PHP aggiuntiva: **non serve
  mbstring** (non sempre installata; un `mb_strtoupper` nella prima versione avrebbe bloccato la pubblicazione).
- Countdown: un fuso UTC fisso non segue l'ora legale; per scadenze "a mezzanotte per tutti" usa l'ora locale.
- Business info: i dati strutturati si pubblicano solo se c'è un nome; non c'è l'indicatore "aperto ora".
- Nel canvas dell'editor contatori, barre e countdown mostrano lo stato finale (gli script girano solo sulla
  pagina pubblicata); Before/After invece è interattivo.
- `master.html` usa `IntersectionObserver` senza controllo (script di "reveal", preesistente): irrilevante nei
  browser attuali, visibile solo in ambienti di test come jsdom.
- Test: `npm test` esegue ora anche `test:content` (149 controlli sul compiler, inclusi script eseguiti in
  jsdom e JSON-LD) e `test:panels` (71 controlli: pannelli e canvas veri montati in jsdom).
## [0.12.0] - 2026-10-06 — Sessione scaduta: lavoro al sicuro, nessun falso successo

### Added
- **Timeout di inattività deterministico lato server** (prima la scadenza dipendeva dal garbage
  collector di PHP, ~24 min e imprevedibile). Default 30 minuti, configurabile in Global Options →
  Security (5–720 min). Il lavoro nell'interfaccia conta come attività: chi modifica a lungo senza
  salvare non viene disconnesso, chi è davvero fermo scade puntualmente.
- **Rilevamento immediato della scadenza**: polling di sola lettura (`session_status`, non allunga la
  sessione), controllo al ritorno sulla scheda / ripresa dalla sospensione / rete tornata, avviso non
  bloccante a ~2 minuti dalla scadenza con "Stay signed in".
- **Login sopra l'app**: alla scadenza compare una schermata di login che copre l'interfaccia, la quale
  resta montata e inerte con tutto il suo stato (menu, impostazioni, editor). Dopo il login si riprende
  esattamente da dove si era.
- **Le richieste fallite vengono completate**: un salvataggio/pubblicazione interrotto dalla scadenza
  resta in attesa e viene rieseguito UNA volta dopo il re-login, con il token CSRF nuovo.
- **Backup locale automatico del lavoro non salvato** (editor di pagine, voci, header/footer, master;
  Menu Builder; Global Options), per utente, nel browser. Dopo un refresh o una nuova sessione si
  propone "Unsaved work found" con Restore/Discard; la pagina di login spiega che la sessione è scaduta.
- Stato del salvataggio nell'editor ("All changes saved" / "Unsaved changes · backed up on this device")
  e conferma quando si esce dall'editor con modifiche non salvate.
- Endpoint `session_status` (sola lettura) e `keepalive`.

### Fixed
- **Falsi successi**: "Draft saved!", "Menu saved…" e "Global options saved…" comparivano anche con
  risposta 401/errore. Ora l'esito è reale; la pubblicazione non parte se il salvataggio fallisce.
- Salvando un **master** con errore, le modifiche venivano scartate con "updated globally": ora si resta
  in modifica.
- Una POST con sessione scaduta riceveva 403 (CSRF) invece di 401: ora il controllo di login precede
  quello CSRF. Un 403 per token CSRF scaduto ma sessione valida si auto-ripara.
- Su 401 l'app si smontava e perdeva lo stato dei componenti.
- Il logout senza rete restava a metà e lasciava stato di lavoro al prossimo utente.
- Se alla scadenza fa login un utente diverso, la scheda non ne adotta l'identità, non esegue le richieste
  in sospeso a suo nome e non scrive i backup dell'altro utente nel suo account (trovato dai test).

### Changed
- Le sessioni PHP stanno in una cartella dedicata (`<data>/sessions`, permessi 0700) con
  `use_strict_mode`: la scadenza non dipende più dal GC di altre applicazioni sul server.
- Le API rispondono con `Cache-Control: no-store`.

### Notes
- Al primo aggiornamento tutti gli utenti dovranno rifare il login una volta (cambia la cartella sessioni).
- I backup sono per browser e per utente (non seguono l'utente su un altro dispositivo) e vengono
  eliminati dopo 14 giorni. Non c'è rilevamento di conflitti se un'altra persona modifica nel frattempo
  la stessa pagina.
- Test: `npm test` esegue ora anche i test di sessione (150 controlli: backup, tracker, gestore con server
  finto e orologio simulato, guardia sulle fetch) e l'integrazione sull'interfaccia vera (49 controlli:
  la vera `App` in jsdom). Verificati con test di mutazione (bug piantati di proposito, tutti rilevati).
## [0.11.0] - 2026-10-06 — Nuovi blocchi: Accordion, Tabs, Pricing, Gallery

### Added
- **Accordion**: voci con contenuto ricco (HTML), stile Cards/Flat, icona
  (+ / ▾ / nessuna), prima voce aperta, modalità *esclusiva* (una sola aperta) o
  *multipla*. Usa `<details>`: funziona senza JavaScript. (Il blocco **FAQ**
  resta per le domande/risposte in testo semplice.)
- **Tabs**: schede con contenuto ricco, stile Underline/Pills, allineamento
  sinistra/centro/destra. Implementati solo in CSS (radio + `:checked`): nessun
  JavaScript, funzionano anche con JS disattivato e si navigano con le frecce.
- **Pricing**: piani con nome, prezzo, periodo, descrizione, elenco funzionalità
  (una per riga), pulsante (URL, `mailto:`, o pagina del sito), piano
  **evidenziato** con badge. Colonne automatiche (max 4), 1 colonna su mobile.
- **Gallery con lightbox**: layout *Grid* (miniature uniformi con rapporto
  scelto) o *Masonry* (rapporti naturali), 1–6 colonne, gap, bordi arrotondati,
  didascalie opzionali. Lightbox con precedente/successivo, tastiera (←/→/Esc),
  swipe su touch, click sullo sfondo, focus intrappolato e ripristinato; senza
  JavaScript l'immagine si apre comunque (link diretto). Immagini aggiungibili
  dal Media Manager.
- Pannelli di configurazione con riordino (↑/↓), rimozione e aggiunta delle voci.
- Accordion e Tabs sono interattivi anche nel canvas dell'editor.
- Test comportamentali (`npm run test:blocks`, incluso in `npm test`): logica dei
  Tabs valutata sugli elementi realmente selezionati dalla CSS, lightbox eseguita
  in jsdom, sanificazione, accordion esclusivo/multiplo, URL del Pricing.

### Changed
- Il test di parità confronta ora anche il testo dei tag `<style>` per i blocchi
  il cui CSS porta logica (Accordion, Tabs, Pricing, Gallery) e include i default
  reali di `blocks.json`. Prima i `<style>` erano ignorati: una regressione nella
  logica dei Tabs sarebbe passata inosservata.
- Nuova devDependency: `jsdom` (solo per i test).

### Notes
- Nessuna migrazione DB; `content_schema` invariato (i nuovi tipi sono additivi).
- Il contenuto dei pannelli Accordion/Tabs si modifica come testo/HTML nel
  pannello laterale (come Grid/Cards), non con l'editor visuale inline.
- Il contenuto ricco viene sanificato lato server (script, `on*`, `javascript:`).
## [0.10.1] - 2026-10-06

### Fixed
- **Stato "Archived" delle voci non mantenuto**: l'editor della voce non caricava
  il flag (il checkbox partiva sempre vuoto) e ogni salvataggio inviava
  `archived: 0`, cancellando lo stato impostato dalla lista. Ora l'editor carica
  il valore reale e lo salva correttamente.
- Il backend non azzera più il flag quando un salvataggio non lo include: se la
  chiave `archived` manca, viene **conservato** il valore già salvato.
- Il toggle Archivia/Ripristina nella lista usava un test di veridicità JS che con
  un valore `"0"` (stringa, come restituito da alcune versioni di PHP/PDO) non
  archiviava mai. Ora `get_item`/`get_items` restituiscono sempre un intero e il
  toggle confronta numericamente.

### Added
- Dopo aver archiviato/ripristinato dalla lista compare un avviso con il
  pulsante **Publish now**: le liste pubbliche (Collection List) si generano in
  build, quindi si aggiornano alla pubblicazione successiva. Nessuna
  ripubblicazione automatica (per non pubblicare modifiche non ancora confermate).
## [0.10.0] - 2026-10-06 — Blog: archivio, cover, lista, "mostra tutti"

### Added
- **Archiviazione delle voci**: ogni voce ha un flag **Archived**. L'articolo
  archiviato resta pubblicato e visitabile, ma esce dalla lista principale.
  Nella sezione Collections c'è un badge "archived" e un pulsante rapido per
  archiviare/ripristinare.
- **Item Settings** nell'editor della voce: finalmente si impostano **cover
  image** (con upload), **excerpt**, **data**, **stato** e **Archived**.
- Blocco **Collection List** ampliato:
  - **Source**: Active (non archiviati) / Archived only / All — un unico blocco
    copre sia la home sia la pagina archivio (niente blocco duplicato);
  - **Layout**: Grid (card) o **List** (righe, ideale con molti articoli);
  - **Show all**: ignora il limite e mostra tutte le voci (es. pagina archivio).
    Il limite resta utile per "ultimi N" (es. 3 in home).

### Changed
- **Migrazione DB v5**: colonna `collection_items.archived`. Automatica.

### Note di design
Ho preferito un'unica `COLLECTION_LIST` con opzione *Source* invece di un blocco
`ARCHIVE_LIST` separato: un solo blocco da mantenere, più flessibile. La
paginazione vera (pagine /2, /3…) resta un possibile passo futuro; con "Show all"
su una pagina archivio dedicata lo storico è comunque interamente accessibile.
## [0.9.1] - 2026-10-06 — Blog / Collezioni (parte 2: blocco lista)

### Added
- Nuovo blocco **Collection List**: elenca le voci pubblicate di una collezione
  in qualsiasi pagina, come griglia di card (cover, data, titolo, excerpt) con
  link alla pagina della voce. Configurabile dal pannello: collezione, numero di
  voci, colonne, e toggle per cover/data/excerpt. Responsive (1 colonna su mobile).
- Il blocco è **dinamico**: in build il compiler inserisce le voci reali (ordinate
  per data, solo pubblicate); nell'editor mostra un'anteprima segnaposto.

### Notes
- Essendo dinamico, è escluso dal test di parità statico (come i Master).
- Con questo il blog è "navigabile": crei la collezione e le voci (0.9.0) e metti
  un Collection List nella home o in una pagina archivio per elencarle.
## [0.9.0] - 2026-10-06 — Blog / Collezioni (parte 1)

### Added
- **Collezioni**: tipi di contenuto ripetibili (Blog, Portfolio, …) con voci
  multiple. Nuova sezione **Collections** in dashboard:
  - creazione/eliminazione collezioni (admin);
  - voci con titolo, slug, excerpt, cover, data, stato (draft/published), SEO;
  - ogni voce si modifica con lo **stesso editor a blocchi** delle pagine.
- **Generazione statica delle voci**: ogni voce pubblicata diventa una pagina
  `/<collezione>/<voce>/index.html`, con menu, header/footer globali, meta
  OpenGraph (type=article, cover come immagine social) e inclusione nella sitemap.
- Endpoint: `get_collections`, `save_collection`, `delete_collection` (admin),
  `get_items`, `get_item`, `save_item`, `delete_item`.

### Changed
- **Migrazione DB v4**: tabelle `collections` e `collection_items`. Applicata in
  automatico (verificata su DB nuovi ed esistenti).
- Rimossi i pulsanti Header/Footer dalla dashboard (ora sono in Global Options).

### Next (parte 2)
- Blocco "lista voci / archivio" da inserire in qualsiasi pagina (es. l'elenco
  dei post del blog), con card, excerpt e link alle voci.
## [0.8.1] - 2026-10-06

### Added
- In **Global Options** → "Global Header & Footer": interruttori per
  **abilitare/disabilitare** header e footer globali (quando disabilitati non
  vengono mostrati su nessuna pagina), più pulsanti **Edit** e **Delete** per
  ciascuno. Il delete rimuove tutti i blocchi di quella parte.
- Endpoint `delete_part` (svuota header o footer).
## [0.8.0] - 2026-10-05 — Header/Footer globali

### Added
- **Header e Footer globali**: due aree a blocchi (costruite con lo stesso editor)
  applicate automaticamente a **tutte** le pagine pubblicate — l'header prima del
  contenuto, il footer dopo, entrambi a tutta larghezza.
- Dashboard: pulsanti **Header** e **Footer** per aprirli nell'editor; i blocchi
  "codice" restano riservati agli admin (stripping lato server anche qui).
- Export/Import del sito ora includono anche header e footer.

### Changed
- **Migrazione DB v3**: nuova tabella `site_parts` (header/footer). Applicata in
  automatico dal migration runner (verificata su DB nuovi ed esistenti).
## [0.7.3] - 2026-10-05 — UI refresh (pass 2): editor

### Changed
- **Editor più denso e premium**:
  - i blocchi nel pannello di aggiunta ora sono in una **griglia a 2 colonne** di
    tile compatte (icona + etichetta breve), molto più dense e ordinate rispetto
    alla lista a tutta larghezza;
  - pannelli laterali più stretti (sinistra 270→250, destra 320→300) per dare più
    spazio al canvas;
  - barra fluttuante, accordion, header del pannello proprietà e barra Save/Publish
    con spaziature ridotte;
  - meno padding attorno al canvas (più area di lavoro).
- Etichette dei blocchi accorciate (Section, Container, Cards, Video, Form, FAQ,
  Slider, Maps, Image…) per chiarezza e densità.
## [0.7.2] - 2026-10-05 — UI refresh (pass 1 rev.): densità alta & dashboard

### Changed
- **Densità aumentata molto** su tutta l'interfaccia admin: padding dei
  contenitori più stretti e **campi input/label più compatti** (altezza e font
  ridotti) nelle schermate ricche di form (Global Options, Menu Builder,
  Property Panel, Accounts) — più informazioni a schermo su 14" FHD.
- **Dashboard riorganizzata**: la pillola utente (nome + ruolo) è ora in alto a
  sinistra con il pulsante **Logout** accostato; le azioni primarie (New Page,
  Publish All) in alto a destra; la navigazione secondaria (Templates, Media,
  Menu, Global Options, Submissions, Accounts, Export, Import) in una barra
  compatta dedicata. Pulsanti più piccoli ed eleganti.
- Il pulsante "Account" è ora **"Accounts"**.
## [0.7.1] - 2026-10-05 — UI refresh (pass 1): densità & premium

### Added
- Base UI globale (`src/ui/global.css`) con palette e **design token** condivisi,
  scrollbar sottili, rendering testo migliorato, selezione e ingresso morbido.
  Volutamente non tocca gli elementi generici per non alterare l'anteprima del
  canvas.

### Changed
- **Densità ridotta** su tutta l'interfaccia admin per sfruttare meglio gli
  schermi piccoli (14" FHD): padding dei contenitori principali, della dashboard
  (header, toolbar, righe), dell'editor (barra, pannelli) e del DOM Navigator
  leggermente più stretti, mantenendo respiro e leggibilità.
## [0.7.0] - 2026-10-05 — SEO/pubblicazione & form avanzati

### Added
- **SEO & pubblicazione**: generazione automatica di `sitemap.xml`, `robots.txt`
  e pagina `404.html` ad ogni build; meta **OpenGraph/Twitter** per pagina
  (titolo, descrizione, immagine, url, site name) e **favicon** nel `<head>`;
  `ErrorDocument` per Apache. Nuove opzioni in Global Options: Site URL, Site
  Name, Favicon, immagine social di default, toggle indicizzazione (robots).
- Campo **immagine social (OG) per pagina** nel pannello SEO.
- **Form avanzati**: ogni invio viene **archiviato nel database**; nuova sezione
  **Submissions** (admin) per consultarli, con **export CSV** e cancellazione.
  Anti-spam **honeypot** integrato nei form (gli invii-bot vengono scartati).
- Endpoint: `get_submissions`, `export_submissions`, `delete_submission`,
  `clear_submissions` (admin).

### Changed
- **Migrazione DB v2** (prima oltre la baseline): colonna `pages.seo_image` e
  tabella `form_submissions`. Applicata automaticamente dal migration runner
  (verificata idempotente, su DB nuovi ed esistenti).
- Gli invii dei form vengono archiviati **anche** se l'email non è configurata.

### Notes
- La sitemap usa URL assoluti se imposti "Site URL" in Global Options.
- Export/import del sito ora includono anche `seo_image`.
## [0.6.1] - 2026-10-05

### Changed
- Rimosso "Pro" dal nome del prodotto (schermata di login) e dall'etichetta
  "Custom Code" nel pannello proprietà.
- Invertite le icone dei pulsanti Export/Import nella dashboard.

### Added
- Nella lista pagine della dashboard, pulsante per **aprire la pagina in una
  nuova scheda** del browser (apre la versione pubblicata).
- Piccola cura UI: colonna azioni allargata e hover sulle righe della lista pagine.
## [0.6.0] - 2026-10-05 — Step C: templates & import/export

### Added
- **Template di partenza (starter)**: nuova sezione "Templates" nella dashboard
  con pagine pronte (Blank, Landing Page, About, Contact). Scegliendone una si
  crea una nuova pagina-bozza completamente modificabile. I template sono in
  `canvascore-admin/starters.json` (facilmente estendibili).
- **Esporta sito**: l'admin può scaricare un backup completo del sito in un unico
  file JSON (pagine, menu, impostazioni, master, template) + manifest dei media.
- **Importa sito**: l'admin può ripristinare/sostituire il sito da un file di
  export (gli account utente NON vengono toccati). L'import gira in transazione e
  applica eventuali migrazioni di contenuto.
- Endpoint: `get_starters`, `export_site` (admin), `import_site` (admin).

### Notes
- Export/import coprono struttura e configurazione. I file media in `/uploads`
  vanno copiati a parte quando si sposta il sito su un altro server (il manifest
  nell'export elenca i file referenziati). Per backup/ripristino sullo stesso
  server, i media restano al loro posto e il ripristino è completo.
- Round-trip export→modifica→import verificato: il sito viene ripristinato
  identico (pagine, homepage, menu, impostazioni).
## [0.5.1] - 2026-10-05

### Fixed
- **FAQ e FORM non venivano renderizzati nel canvas editor** (apparivano come
  "Unknown element") mentre erano corretti nella pagina compilata: mancavano nel
  renderer canonico JS. Aggiunti e ora coperti dal test di parità.
- **Flex Row e CSS Grid nel canvas editor**: i blocchi figli non si
  dimensionavano/allineavano correttamente. La cornice di selezione/drag ora
  porta le proprietà di sizing/posizionamento (width, flex, grid, margin, ...)
  comportandosi come l'item reale, mentre il contenuto canonico le neutralizza
  (niente doppia applicazione). Flex/grid in editor combaciano col sito.
- **Slider nel canvas editor**: ora anima sia l'effetto fade (dissolvenza) sia lo
  slide (scorrimento), pilotando il DOM canonico. Prima erano statici in editor.
- **DOM Navigator**: il drag verso il basso non funzionava (si poteva solo
  trascinare in su). Il riordino tra fratelli ora è direzionale (arrayMove),
  quindi funziona in entrambi i versi.

### Added
- Test di parità esteso con FAQ, FORM e **casi incrociati** (Flex Row e CSS Grid
  con blocchi annidati dentro): 23 fixture, tutte verdi.
## [0.5.0] - 2026-10-05

### Added
- **Drag & drop cross-container**: nel canvas si possono ora spostare gli
  elementi tra container/sezioni diversi e dentro le celle di CSS Grid / Simple
  Grid, oltre a riordinarli. Trascinando un blocco su un container vuoto, viene
  inserito al suo interno; trascinandolo su un altro blocco, diventa suo fratello
  nella stessa posizione.
- **Drag & drop nel DOM Navigator** (pannello sinistro): ogni voce ha una
  maniglia per trascinare, con riordino e ri-annidamento tra container/sezioni.
- Spostamento dell'albero unificato e anti-ciclo (`moveBlock`): impedisce di
  spostare un blocco dentro un proprio discendente.

### Notes
- Logica di spostamento verificata in isolamento su tutti i casi (cross-container,
  container vuoti, riordino, prevenzione cicli, spostamento di sotto-alberi).
- La precisione del "bersaglio" nel canvas dipende dal rilevamento collisioni di
  dnd-kit: per ri-annidamenti precisi il DOM Navigator è lo strumento più comodo.
## [0.4.0] - 2026-10-05

### Changed
- **Fase 2 chiusa — editor collegato al renderer canonico.** L'editor non ha più
  una propria implementazione di rendering separata: le voci visive (immagini,
  pulsanti, slider, card, grid, icone, testimonial, video, mappe, HTML) e i
  contenuti non in modifica vengono mostrati con lo **stesso HTML del sito
  pubblicato** (renderer `renderBlock.mjs`). I container usano `blockRoot`, fonte
  unica condivisa con il compiler per l'elemento radice. Resta codice React solo
  per l'editing inline (Jodit) dei blocchi testuali quando sono selezionati.
- Di conseguenza l'anteprima nel canvas combacia con la pagina compilata (inclusi
  allineamento dei pulsanti, aspect-ratio degli slider/immagini, ecc.).

### Added
- `blockRoot()` nel renderer canonico: descrizione dell'elemento radice di un
  blocco, condivisa tra editor (React) e compiler.

### Fixed
- Il test di parità normalizza ora gli stili in modo semantico (spaziatura
  irrilevante attorno a `:` e `,`), così confronta l'equivalenza reale CSS.

### Notes
- L'output pubblicato (compiler PHP) non cambia ed è coperto dal test di parità
  (`npm run test:parity`), tuttora verde su tutti i 19 blocchi.
## [0.3.2] - 2026-10-04

### Fixed
- Colore testo e colore hover del menu non si applicavano alle voci di primo
  livello (solo ai sottomenu) e lo sfondo in hover non si applicava mai: conflitto
  di specificità con le regole globali del tema. Ora il menu è **autoritativo**
  (usa !important sui propri colori) e le regole di menu legacy sono state rimosse
  dal template, quindi i colori configurati vincono sempre.
- "Logo / buttons gap": nel menu reale la distanza non veniva applicata perché un
  `margin:0` nella lista azzerava il `margin-left`. Corretto l'ordine degli stili.

### Added
- **Anteprima autentica** nel Menu Builder: ora è generata dal vero compiler e
  mostrata in un iframe isolato, quindi identica al menu pubblicato (hover,
  effetti, logo, layout). I link sono resi inerti.
- Impostazioni globali: flag **"Let the menu inherit the global brand color on
  hover"** (default OFF). Spento, il menu usa solo i colori impostati nel Menu
  Builder; acceso, l'hover usa il colore brand globale.

### Changed
- Rimosse dal template (`master.html`) le regole CSS di menu legacy: tutto lo
  stile del menu è ora generato dal Menu Builder, senza conflitti.
## [0.3.1] - 2026-10-04

### Fixed
- I colori del menu (testo, testo in hover, sfondo in hover) non cambiavano:
  erano sovrascritti da regole globali del template con specificità maggiore.
  Ora le regole del menu sono prefissate con `.cc-navigation` e hanno la
  precedenza.
- Menu "sticky" non funzionante: `body { overflow-x: clip }` del template rompe
  `position: sticky`. Il menu sticky ora usa `position: fixed` (con compensazione
  automatica dell'altezza), quindi resta davvero in alto.
- Effetto "glare": il bagliore clippava i sottomenu all'altezza della barra.
  Ora lo sheen è su un overlay dedicato clippato solo alla barra, i dropdown non
  vengono più tagliati.

### Added
- Menu Builder: il campo "Item border" ha ora un menu a tendina con preset
  (none, thin, solid, dashed, dotted) oltre all'opzione Custom.
- Menu Builder: il campo "Item radius" si regola con le frecce su/giù.
- Menu Builder: oltre all'URL, il logo si può caricare direttamente (upload),
  e il file finisce nel Media Manager.
- L'endpoint di upload restituisce l'URL del file caricato.

## [0.3.0] - 2026-10-04

### Added
- Menu Builder riscritto su un **modello ad albero annidato** (children) con
  anteprima live e riordino **drag & drop** tra elementi dello stesso livello;
  i pulsanti ⇥/⇤ annidano/dis-annidano una voce come sottomenu.
- Voci di menu **senza link**: lasciando l'URL vuoto, la voce principale apre solo
  il proprio sottomenu (utile quando non esiste una pagina per il livello padre).
- Sottomenu multilivello (anche sotto-sottomenu) con dropdown a cascata.
- Personalizzazione estesa del menu: bordi delle voci, spaziatura tra le voci,
  colore testo, colore testo/sfondo al passaggio del mouse, altezza della barra,
  colore di sfondo con **opacità** regolabile, ombra (soft/medium/strong).
- Logo: immagine, altezza, allineamento (sinistra/destra) **indipendente** da
  quello dei pulsanti, con distanza configurabile e la logica di priorità
  richiesta (stesso lato = logo e pulsanti accostati; lati opposti = agli estremi).
- Effetti "premium" selezionabili: sottolineatura animata, lift, glassmorphism
  (blur), glare (riflesso animato).
- Dashboard: indicatore dell'utente loggato (nome + ruolo) in alto.

### Fixed
- Bug dei sottomenu: spostando una voce da un menu a un altro il genitore non
  veniva aggiornato (modello piatto con parentId). Col nuovo albero annidato il
  riordino e l'annidamento sono coerenti e persistono correttamente.

### Notes
- Retrocompatibilità: i menu salvati nel vecchio formato piatto (parentId)
  vengono convertiti automaticamente in albero sia nell'editor sia nel compiler.

## [0.2.1] - 2026-10-04

### Fixed
- Un nuovo utente (es. editor) creato dall'admin non veniva obbligato a cambiare
  la password al primo accesso: ora `add_user` imposta `must_change_pw`, e anche
  il reset password da parte dell'admin (`force_password`) forza il cambio al
  prossimo accesso dell'utente.
- Ciclo di vita del token CSRF più robusto nei cambi utente: il login allinea il
  cookie double-submit al nuovo token di sessione e il logout lo cancella. Elimina
  i token stantii tra sessioni di utenti diversi (causa probabile di POST
  rifiutate dopo aver effettuato il login come utente differente nello stesso
  browser).

## [0.2.0] - 2026-10-04

### Added
- Versionamento automatico: ogni `npm run build` incrementa un numero di build e
  marca la data (campi `build`/`built` in version.json via `scripts/bump.mjs` +
  hook `prebuild`). La versione (build inclusa) è mostrata nel pannello.
- Fondamenta del contratto di rendering unico:
  - `canvascore-admin/blocks.json`: unica fonte di verità per i default dei
    blocchi (contenuto + stili), consumata sia dall'editor (via Vite) sia dal PHP.
  - `src/render/renderBlock.mjs`: renderer canonico in JS puro, speculare al
    compiler PHP.
  - Test di parità automatico (`npm run test:parity`): confronta struttura e
    stili prodotti dal renderer JS e dal compiler PHP su un set di fixture;
    fallisce in caso di divergenza.
- `addBlock` dell'editor ora costruisce i blocchi da `blocks.json` (niente più
  default duplicati e impliciti).

### Fixed
- Blocco ICON_BOX: attributo `style` duplicato nel compiler (HTML non valido) che
  rendeva inefficace l'allineamento del testo; ora un solo attributo corretto.
  (divergenza individuata automaticamente dal nuovo test di parità).
- Pulizia di un doppio attributo `style` anche su TESTIMONIAL.

## [0.1.0] - 2026-10-04

Prima release versionata. Raccoglie il lavoro di stabilizzazione (Fase 0) e di
sicurezza (Fase 1) portato a un MVP avanzato, stabile e utilizzabile.

### Added
- Sistema di versioning: `version.json` come unica fonte di verità per versione
  app, schema DB e schema contenuti; endpoint `?action=version`; versione
  mostrata nel pannello e iniettata nel build del frontend; `<meta generator>`
  nelle pagine compilate.
- Runner di migrazioni DB versionato (`migrations.php`) con tabella `cc_meta`,
  che sostituisce la vecchia pila di `ALTER ... try/catch` e converge sia le
  installazioni nuove sia quelle esistenti.
- Scaffold per le migrazioni dei contenuti (formato blocchi) e colonna
  `content_schema` stampata sulle pagine salvate.
- Gestione della homepage: flag esclusivo "Set as Homepage", pubblicata nella
  root qualunque sia lo slug.
- CSRF con token di sessione + cookie double-submit; sessione blindata
  (HttpOnly, SameSite=Lax, Secure in HTTPS).
- Cambio password forzato al primo accesso per l'admin di default.
- Data dir spostata fuori dalla webroot (con test di scrittura reale e
  migrazione bidirezionale di sicurezza).
- Sanitizzazione XSS dei contenuti rich-text; blocchi "codice" (HTML/CSS custom)
  riservati agli admin, con rimozione lato server per i non-admin.
- Registry server-side dei destinatari dei form (`forms.json`): niente più email
  nel client, con ripristino del destinatario per-form.
- Auto-slug dal titolo per le pagine non ancora pubblicate.
- Drag & drop reale dei blocchi (riordino tra fratelli a ogni livello).

### Changed
- `api.php` e `rebuild_all.php` ora usano un modulo condiviso (`config.php`) per
  sessione, data dir, CSRF e sanitizzazione.
- Upload media: whitelist di estensioni immagine + verifica MIME; `.htaccess`
  FPM-safe che impedisce l'esecuzione di script in `/uploads`.

### Fixed
- La pubblicazione non funzionava più (colonne di schema mancanti): schema ora
  completo e migrato automaticamente.
- Flusso draft → copia nascosta → publish → discard allineato tra frontend e
  backend.
- SQL injection nel rinomino slug (ora prepared statement) e path traversal
  nella generazione dei file (slug sanitizzato).
- Open relay nel mailer dei form; XSS riflesso nel messaggio di esito.
- Immagini non visibili dopo l'upload (regressione da `php_flag` in `.htaccess`
  su PHP-FPM).
- Salvataggi in 403 su installazioni aggiornate (CSRF fragile sulla sessione
  esistente) e caso "leggo ma non salvo" dovuto alla data dir non scrivibile.
- Rimosso codice morto e componenti non compilabili.

[Unreleased]: https://example.com/canvascore/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/canvascore/releases/tag/v0.1.0

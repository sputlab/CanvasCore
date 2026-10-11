# CanvasCore 0.10.1 — fix stato "Archived"

## File da SOSTITUIRE
Backend: `canvascore-admin/api.php`, `version.json`
Frontend: `src/components/Collections.jsx`
Più: `CHANGELOG.md`
→ poi `cd canvascore-frontend && npm run build`

(Nessuna migrazione DB.)

## Cosa non funzionava
Il flag veniva scritto correttamente dalla lista, ma:
1. l'editor della voce **non lo caricava** → il checkbox "Archived" partiva
   vuoto, e al primo salvataggio dall'editor veniva inviato `archived: 0`,
   cancellando lo stato (per questo "uscendo e rientrando" non si manteneva);
2. un salvataggio che **non includeva** il flag lo azzerava;
3. il toggle dalla lista usava la veridicità JS: con il valore stringa `"0"`
   (che alcune versioni di PHP restituiscono) non archiviava mai.

## Cosa cambia
- L'editor carica il valore reale: il checkbox riflette lo stato e lo mantiene.
- Il backend **conserva** il valore salvato se il flag non viene inviato.
- `get_item`/`get_items` restituiscono sempre un intero; il toggle confronta
  numericamente. Archivia e ripristina funzionano in entrambe le direzioni.
- Dopo archivia/ripristina dalla lista compare un avviso con **Publish now**:
  le Collection List pubbliche si aggiornano alla pubblicazione successiva
  (non ripubblico in automatico per non mandare online modifiche non confermate).

## Verificato (sul vero api.php)
Archivia dalla lista → editor apre e salva → il flag resta; salvataggio che
omette il flag → resta; ripristina dalla lista → torna a 0; deseleziono nell'editor
→ 0; valori stringa "0"/"1" gestiti. Prima del fix, il passo "editor salva" e
"salvataggio senza flag" azzeravano il flag.

import type { MessageKey } from "./en";

// Italian translations. Typed as a *partial* map: any key omitted here falls
// back to English at runtime, so translation can land incrementally. The
// completeness gate (M6) tightens this to full coverage.
//
// Language names (language.name.*) intentionally stay in their own language.
export const it: Partial<Record<MessageKey, string>> = {
  "app.title": "IU2FRL MD380 Codeplug Editor",

  "language.label": "Lingua",
  "language.current": "Lingua attuale: {name}",
  "language.name.en": "English",
  "language.name.it": "Italiano",
  "language.name.fr": "Français",

  "common.cancel": "Annulla",
  "common.apply": "Applica",
  "common.close": "Chiudi",
  "common.undo": "Annulla",
  "common.redo": "Ripeti",
  "common.backHome": "Torna alla Home",

  // --- Editor shell (header + top actions) ---
  "shell.loaded": "Caricato: {file} ({format})",
  "shell.status.dirty": "Modifiche non salvate",
  "shell.status.clean": "Salvato",
  "shell.undoRedo": "Annulla: {undo} | Ripeti: {redo}",
  "shell.openAnother": "Apri un altro file",
  "shell.export": "Esporta file corrente",
  "shell.tablistLabel": "Sezioni del codeplug",
  "validation.heading": "Validazione",
  "validation.none": "Nessun problema di validazione.",

  // --- Tab labels ---
  "tab.basic": "Base",
  "tab.general": "Generale",
  "tab.menus": "Menu",
  "tab.buttons": "Pulsanti",
  "tab.digitalText": "Messaggio di testo digitale",
  "tab.encryption": "Crittografia",
  "tab.digitalContacts": "Contatti digitali",
  "tab.dtmf": "DTMF",
  "tab.oneTouch": "One Touch",
  "tab.zones": "Zone",
  "tab.groupLists": "Liste di gruppo",
  "tab.scanLists": "Liste di scansione",
  "tab.channels": "Canali",
  "tab.radioTransfer": "Trasferimento radio",

  // --- Landing: hero + risk ---
  "landing.intro": "Una semplice applicazione web per interagire con il codeplug del tuo MD380, dove tutto avviene nel browser.",
  "landing.risk.heading": "Attenzione",
  "landing.risk.body": "Questa app è ancora in fase di sviluppo.<br>Non tutte le funzioni sono state testate e il suo utilizzo potrebbe creare un codeplug inutilizzabile che può bloccare il ricetrasmettitore.<br>È molto difficile rendere inutilizzabili questi dispositivi grazie al loro design robusto e al bootloader, ma nessuna operazione può essere considerata sicura al 100%.<br>Procedendo, accetti ogni rischio e riconosci che il responsabile del progetto non è responsabile per eventuali danni o malfunzionamenti del dispositivo.<br>Se il ricetrasmettitore si blocca durante o dopo un'operazione di lettura/scrittura, scollegalo dal PC e riavvialo usando la manopola del volume.<br>",
  "landing.risk.noteIntro": "Nota bene:",
  "landing.risk.note.opengd77": "Questa app non supporta (ancora) il firmware OpenGD77.",
  "landing.risk.note.firmwares": "Questa app supporta solo firmware originali o patchati (tramite <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"nofollow\">md380tools</a>) per MD380 e MD390.",
  "landing.risk.note.browser": "Questa app richiede Chrome, Edge o qualsiasi browser basato su Chromium con supporto WebUSB. Firefox e Safari non sono supportati per mancanza dell'API WebUSB.",
  "landing.risk.ack": "Ho compreso e accetto ogni rischio, inclusi possibili danni o blocchi del dispositivo.",
  "landing.radioProgress.heading": "Avanzamento trasferimento radio",

  // --- Landing: tiles ---
  "landing.tile.setup.heading": "Guida alla configurazione",
  "landing.tile.setup.desc": "Istruzioni per configurare il browser e il sistema operativo per comunicare con la radio via USB.",
  "landing.tile.setup.button": "Mostra guida alla configurazione",
  "landing.tile.create.heading": "Crea nuovo codeplug",
  "landing.tile.create.desc": "Parti da un profilo vuoto e costruisci il tuo codeplug da zero.",
  "landing.tile.create.alpha": "Questa funzione è in fase di test alpha e potrebbe necessitare di ulteriori perfezionamenti per garantire che i codeplug generati siano pienamente compatibili con tutti i modelli di radio e versioni di firmware.",
  "landing.tile.create.md380": "Crea nuovo codeplug MD380",
  "landing.tile.create.md390": "Crea nuovo codeplug MD390",
  "landing.tile.open.heading": "Apri codeplug esistente",
  "landing.tile.open.desc1": "Importa un file <code>.rdt</code> o <code>.bin</code> esistente per modificarlo in sicurezza nel browser.",
  "landing.tile.open.desc2": "Il formato preferito è <code>.rdt</code>, che può essere esportato da alcune applicazioni come <strong>G6AMU Codeplug Editor</strong>.<br><strong>Nota bene:</strong> il formato <code>.bin</code> non contiene tutte le informazioni del dispositivo (nessun header personalizzato), quindi alcune funzioni potrebbero non essere pienamente supportate.",
  "landing.tile.open.button": "Apri .rdt/.bin",
  "landing.tile.read.heading": "Leggi codeplug dalla radio",
  "landing.tile.read.desc": "Collega la radio e carica il codeplug corrente direttamente in questa sessione del browser.",
  "landing.tile.read.button": "Leggi codeplug dalla radio",
  "landing.tile.callsign.heading": "Aggiorna database nominativi",
  "landing.tile.callsign.desc": "Scarica l'ultimo database dei nominativi e scrivilo nel ricetrasmettitore.",
  "landing.tile.callsign.button": "Aggiorna database nominativi",
  "landing.tile.timeSync.heading": "Sincronizza data e ora radio",
  "landing.tile.timeSync.desc": "Sincronizza data, ora e fuso orario da questa macchina all'orologio del ricetrasmettitore.",
  "landing.tile.timeSync.button": "Sincronizza data e ora",
  "landing.tile.screenshot.heading": "Screenshot radio",
  "landing.tile.screenshot.desc": "Cattura il display LCD corrente (160x128 px) dalla radio e salvalo come PNG. Richiede firmware patchato, vedi <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"noopener noreferrer\">MD380 Tools</a>.",
  "landing.tile.screenshot.button": "Cattura screenshot",
  "landing.tile.firmware.heading": "Backup firmware",
  "landing.tile.firmware.desc": "Crea un backup del firmware della radio (848 KB). Richiede l'accesso manuale alla modalità bootloader STM32 accendendo il ricetrasmettitore mentre si tengono premuti il PTT e il pulsante sopra di esso.",
  "landing.tile.firmware.button": "Backup firmware",

  // --- Landing: credits ---
  "landing.credits.heading": "Riconoscimenti",
  "landing.credits.body1": "Sviluppato da <a href=\"https://github.com/iu2frl\" target=\"_blank\" rel=\"noopener noreferrer\">IU2FRL</a> su GitHub Pages e rilasciato sotto la <a href=\"https://www.gnu.org/licenses/gpl-3.0.html\" target=\"_blank\" rel=\"noopener noreferrer\">GNU General Public License v3</a>.",
  "landing.credits.lastUpdate": "Ultimo aggiornamento: {date}",
  "landing.credits.body2": "Questo progetto è open source su <a href=\"https://github.com/iu2frl/md380-codeplug-editor\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub</a>.<br>Segnala eventuali problemi su <a href=\"https://github.com/iu2frl/md380-codeplug-editor/issues\" target=\"_blank\" rel=\"noopener noreferrer\">md380-codeplug-editor/issues</a> e contribuisci se puoi!",
  "landing.credits.body3": "Un ringraziamento speciale a <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"noopener noreferrer\">MD380-Tools</a> e <a href=\"https://github.com/DaleFarnsworth/codeplug\" target=\"_blank\" rel=\"noopener noreferrer\">GO Codeplug</a> come fonti di ispirazione.",
};

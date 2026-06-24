import type { MessageKey } from "./en";

// French translations. Typed as a *partial* map: any key omitted here falls
// back to English at runtime, so translation can land incrementally. The
// completeness gate (M7) tightens this to full coverage.
//
// Language names (language.name.*) intentionally stay in their own language.
export const fr: Partial<Record<MessageKey, string>> = {
  "app.title": "IU2FRL MD380 Codeplug Editor",

  "language.label": "Langue",
  "language.current": "Langue actuelle : {name}",
  "language.name.en": "English",
  "language.name.it": "Italiano",
  "language.name.fr": "Français",

  "common.cancel": "Annuler",
  "common.apply": "Appliquer",
  "common.close": "Fermer",
  "common.undo": "Annuler",
  "common.redo": "Rétablir",
  "common.backHome": "Retour à l'accueil",

  // --- Editor shell (header + top actions) ---
  "shell.loaded": "Chargé : {file} ({format})",
  "shell.status.dirty": "Modifications non enregistrées",
  "shell.status.clean": "Enregistré",
  "shell.undoRedo": "Annuler : {undo} | Rétablir : {redo}",
  "shell.openAnother": "Ouvrir un autre fichier",
  "shell.export": "Exporter le fichier actuel",
  "shell.tablistLabel": "Sections du codeplug",
  "validation.heading": "Validation",
  "validation.none": "Aucun problème de validation.",

  // --- Tab labels ---
  "tab.basic": "Base",
  "tab.general": "Général",
  "tab.menus": "Menus",
  "tab.buttons": "Boutons",
  "tab.digitalText": "Message texte numérique",
  "tab.encryption": "Chiffrement",
  "tab.digitalContacts": "Contacts numériques",
  "tab.dtmf": "DTMF",
  "tab.oneTouch": "One Touch",
  "tab.zones": "Zones",
  "tab.groupLists": "Listes de groupes",
  "tab.scanLists": "Listes de balayage",
  "tab.channels": "Canaux",
  "tab.radioTransfer": "Transfert radio",

  // --- Landing: hero + risk ---
  "landing.intro": "Une application web simple pour interagir avec le codeplug de votre MD380, où tout se passe dans le navigateur.",
  "landing.risk.heading": "Avertissement",
  "landing.risk.body": "Cette application est encore en cours de développement.<br>Toutes les fonctionnalités n'ont pas été testées et son utilisation peut créer un codeplug inutilisable susceptible de bloquer votre émetteur-récepteur.<br>Il est très difficile de rendre ces appareils inutilisables grâce à leur conception robuste et à leur bootloader, mais aucune opération ne peut être considérée comme sûre à 100%.<br>En continuant, vous acceptez tous les risques et reconnaissez que le responsable du projet n'est pas responsable des dommages ou dysfonctionnements de l'appareil.<br>Si votre émetteur-récepteur se bloque pendant ou après une opération de lecture/écriture, débranchez-le simplement du PC et redémarrez-le à l'aide du bouton de volume.<br>",
  "landing.risk.noteIntro": "Veuillez noter :",
  "landing.risk.note.opengd77": "Cette application ne prend pas (encore) en charge le firmware OpenGD77.",
  "landing.risk.note.firmwares": "Cette application ne prend en charge que les firmwares originaux ou patchés (via <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"nofollow\">md380tools</a>) pour MD380 et MD390.",
  "landing.risk.note.browser": "Cette application nécessite Chrome, Edge ou tout navigateur basé sur Chromium avec prise en charge de WebUSB. Firefox et Safari ne sont pas pris en charge en raison de l'absence de l'API WebUSB.",
  "landing.risk.ack": "Je comprends et j'accepte tous les risques, y compris d'éventuels dommages ou blocages de l'appareil.",
  "landing.radioProgress.heading": "Progression du transfert radio",

  // --- Landing: tiles ---
  "landing.tile.setup.heading": "Guide de configuration",
  "landing.tile.setup.desc": "Instructions pour configurer votre navigateur et votre système d'exploitation afin de communiquer avec votre radio via USB.",
  "landing.tile.setup.button": "Afficher le guide de configuration",
  "landing.tile.create.heading": "Créer un nouveau codeplug",
  "landing.tile.create.desc": "Partez d'un profil vierge et construisez votre codeplug à partir de zéro.",
  "landing.tile.create.alpha": "Cette fonctionnalité est en phase de test alpha et peut nécessiter des ajustements supplémentaires pour garantir que les codeplugs générés soient pleinement compatibles avec tous les modèles de radio et versions de firmware.",
  "landing.tile.create.md380": "Créer un nouveau codeplug MD380",
  "landing.tile.create.md390": "Créer un nouveau codeplug MD390",
  "landing.tile.open.heading": "Ouvrir un codeplug existant",
  "landing.tile.open.desc1": "Importez un fichier <code>.rdt</code> ou <code>.bin</code> existant pour le modifier en toute sécurité dans le navigateur.",
  "landing.tile.open.desc2": "Le format préféré est <code>.rdt</code>, qui peut être exporté par certaines applications comme <strong>G6AMU Codeplug Editor</strong>.<br><strong>Veuillez noter :</strong> le format <code>.bin</code> ne contient pas toutes les informations de l'appareil (pas d'en-têtes personnalisés), donc certaines fonctionnalités peuvent ne pas être entièrement prises en charge.",
  "landing.tile.open.button": "Ouvrir .rdt/.bin",
  "landing.tile.read.heading": "Lire le codeplug depuis la radio",
  "landing.tile.read.desc": "Connectez votre radio et chargez le codeplug actuel directement dans cette session du navigateur.",
  "landing.tile.read.button": "Lire le codeplug depuis la radio",
  "landing.tile.callsign.heading": "Mettre à jour la base d'indicatifs",
  "landing.tile.callsign.desc": "Téléchargez la dernière base de données d'indicatifs et écrivez-la sur l'émetteur-récepteur.",
  "landing.tile.callsign.button": "Mettre à jour la base d'indicatifs",
  "landing.tile.timeSync.heading": "Synchroniser date et heure de la radio",
  "landing.tile.timeSync.desc": "Synchronisez la date, l'heure et le fuseau horaire de cette machine avec l'horloge de l'émetteur-récepteur.",
  "landing.tile.timeSync.button": "Synchroniser date et heure",
  "landing.tile.screenshot.heading": "Capture d'écran radio",
  "landing.tile.screenshot.desc": "Capturez l'affichage LCD actuel (160x128 px) de la radio et enregistrez-le en PNG. Nécessite un firmware patché, voir <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"noopener noreferrer\">MD380 Tools</a>.",
  "landing.tile.screenshot.button": "Capturer une capture d'écran",
  "landing.tile.firmware.heading": "Sauvegarde du firmware",
  "landing.tile.firmware.desc": "Créez une sauvegarde du firmware de votre radio (848 Ko). Nécessite d'entrer manuellement en mode bootloader STM32 en allumant l'émetteur-récepteur tout en appuyant sur le PTT et le bouton au-dessus.",
  "landing.tile.firmware.button": "Sauvegarder le firmware",

  // --- Landing: credits ---
  "landing.credits.heading": "Crédits",
  "landing.credits.body1": "Développé par <a href=\"https://github.com/iu2frl\" target=\"_blank\" rel=\"noopener noreferrer\">IU2FRL</a> sur GitHub Pages et publié sous la <a href=\"https://www.gnu.org/licenses/gpl-3.0.html\" target=\"_blank\" rel=\"noopener noreferrer\">GNU General Public License v3</a>.",
  "landing.credits.lastUpdate": "Dernière mise à jour : {date}",
  "landing.credits.body2": "Ce projet est open source sur <a href=\"https://github.com/iu2frl/md380-codeplug-editor\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub</a>.<br>Veuillez signaler tout problème sur <a href=\"https://github.com/iu2frl/md380-codeplug-editor/issues\" target=\"_blank\" rel=\"noopener noreferrer\">md380-codeplug-editor/issues</a> et contribuez si vous le pouvez !",
  "landing.credits.body3": "Remerciements particuliers à <a href=\"https://github.com/travisgoodspeed/md380tools\" target=\"_blank\" rel=\"noopener noreferrer\">MD380-Tools</a> et <a href=\"https://github.com/DaleFarnsworth/codeplug\" target=\"_blank\" rel=\"noopener noreferrer\">GO Codeplug</a> comme sources d'inspiration.",
};

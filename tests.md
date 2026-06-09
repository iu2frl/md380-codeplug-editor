# MD380 codeplug editor test suite

## Known codeplug test

### Overview

To check if the parser is working as expected, we should validate against known codeplugs

### Sources

- Codeplug: [MD380-90_All_AU_DMR+analog+CB_v15.rdt](https://github.com/vk2kvp/md380-codeplug/blob/master/MD380-90_All_AU_DMR%2Banalog%2BCB_v15.rdt)
- Content: [MD380-90_All_AU_DMR+analog+CB_CVS_v15.zip](https://github.com/vk2kvp/md380-codeplug/blob/master/MD380-90_All_AU_DMR%2Banalog%2BCB_CVS_v15.zip)

### Procedure

1. Run the known test:
   - `cd web`
   - `npm run test:known`
2. If fixtures are missing, the test automatically:
   - downloads RDT to `web/testdata/known/codeplug.rdt`
   - downloads ZIP to `web/testdata/known/downloads/known-reference.zip`
   - extracts CSV files into `web/testdata/known/reference/`
3. The test parses the RDT and compares against reference CSV exports.
4. Generated parser output is written to:
   - `web/test-results/known/parsed/channels.generated.csv`
   - `web/test-results/known/parsed/contacts.generated.csv`
   - `web/test-results/known/parsed/zones.generated.csv`
   - `web/test-results/known/parsed/groups.generated.csv`
   - `web/test-results/known/parsed/scanlists.generated.csv`

### Current automated scope

- Channels
- Contacts
- Zones
- Groups
- ScanLists

### Optional URL overrides

- `KNOWN_CODEPLUG_RDT_URL=<direct-rdt-url> KNOWN_CODEPLUG_ZIP_URL=<direct-zip-url> npm run test:known`

### TODO

- Tighten the known test further to compare selected field values (not just names), for example channel mode/color code/timeslot against CSV columns.

## Custom tests

### Additional editor checks (current implementation)

1. Perform no-op round-trip:
   - Import `.rdt`
   - Export without edits
   - Confirm header/trailer bytes are preserved and payload size is unchanged
2. Edit settings and verify writeback:
   - Change `Radio Name` and `Radio ID`
   - Export and re-import
   - Confirm values persist
3. Edit channel RF values and verify writeback:
   - For one existing channel, modify:
     - RX frequency
     - TX frequency
     - mode (Analog/Digital)
     - color code
     - timeslot
     - bandwidth
     - power
   - Export and re-import
   - Confirm values persist
4. Reference integrity:
   - Delete a contact used by a channel
   - Verify channel contact reference is cleared and no stale reference remains
   - Delete a channel used by a zone
   - Verify zone membership removes deleted channel
5. Capacity boundaries:
   - Add contacts/channels/zones near record limits
   - Ensure export succeeds and app remains responsive

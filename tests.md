# MD380 codeplug editor test suite

## Overview

To check if the parser is working as expected, we should validate against known codeplugs

## Sources

- Codeplug: [MD380-90_All_AU_DMR+analog+CB_v15.rdt](https://github.com/d76f8670-bbb5-4ed4-96cd-388c75220b01)
- Content: [MD380-90_All_AU_DMR+analog+CB_CVS_v15.zip](https://github.com/fae33ff0-008e-4791-8ba4-df1fd16ec04a)

## Steps

1. Download the RDT codeplug
2. Download the ZIP files
3. Extract the content of the ZIP files
4. Parse the RDT and extract:
   - Channels
   - Contacts
   - Groups
   - ScanLists
   - Zones
5. Ensure the extracted results matches:
   - Channels.csv
   - Contacts.csv
   - Groups.csv
   - ScanLists.csv
   - Zones.csv

## Additional Phase 1 checks (current implementation)

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

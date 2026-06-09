# MD380 codeplug editor

## Goal

Web application hosted on a GitHub Pages website that allows reading and writing a codeplug to/from a Retevis RT3, TYT MD380 and similar devices

## Features

- Upload and interact with existing codeplug
- Upload and download codeplug to the transceiver
- Download modified codeplug to file

## Supported transceivers

- The "D"-Version (NoGPS) for radios without GPS
  - Tytera/TYT MD380
  - Tytera/TYT MD390
  - Retevis RT3

- The "S"-Version (GPS) for radios with GPS
  - Tytera/TYT MD380
  - Tytera/TYT MD390
  - Retevis RT8

## Requirements

- Static website
- Easy to understand
- Should support management of:
  - Channels
  - Zones
  - Contacts
  - Transceiver settings (ID, callsign, etc)

## References

- A GO library to interact with such transceivers is available at `examples/codeplug`
- A set of tools to interact and upload contacts is available at `examples/md380tools`

## Tests

Refer to [tests](./tests.md)

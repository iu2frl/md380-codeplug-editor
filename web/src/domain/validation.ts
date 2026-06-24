import type { CodeplugDocument, ValidationIssue } from "./types";

export function validateDocument(doc: CodeplugDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const channelIds = new Set(doc.channels.map((channel) => channel.id));
  const contactIds = new Set(doc.contacts.map((contact) => contact.id));
  const seenContactNames = new Set<string>();

  for (const zone of doc.zones) {
    if (zone.channelIds.length > 16) {
      issues.push({
        level: "error",
        code: "ZONE_MAX_CHANNELS",
        message: `Zone ${zone.name} has ${zone.channelIds.length} channels. Maximum is 16.`,
        params: { name: zone.name, count: zone.channelIds.length },
      });
    }

    for (const channelId of zone.channelIds) {
      if (!channelIds.has(channelId)) {
        issues.push({
          level: "error",
          code: "ZONE_CHANNEL_REFERENCE",
          message: `Zone ${zone.name} references missing channel #${channelId}.`,
          params: { name: zone.name, channelId },
        });
      }
    }
  }

  for (const channel of doc.channels) {
    if (channel.contactId !== undefined && !contactIds.has(channel.contactId)) {
      issues.push({
        level: "error",
        code: "CHANNEL_CONTACT_REFERENCE",
        message: `Channel ${channel.name} references missing contact #${channel.contactId}.`,
        params: { name: channel.name, contactId: channel.contactId },
      });
    }

    if (!(channel.rxFrequencyMHz > 0)) {
      issues.push({
        level: "error",
        code: "CHANNEL_RX_INVALID",
        message: `Channel ${channel.name} has invalid RX frequency.`,
        params: { name: channel.name },
      });
    }

    if (!(channel.txFrequencyMHz > 0)) {
      issues.push({
        level: "error",
        code: "CHANNEL_TX_INVALID",
        message: `Channel ${channel.name} has invalid TX frequency.`,
        params: { name: channel.name },
      });
    }

    if (channel.colorCode < 0 || channel.colorCode > 15) {
      issues.push({
        level: "error",
        code: "CHANNEL_COLOR_CODE_RANGE",
        message: `Channel ${channel.name} color code must be 0-15.`,
        params: { name: channel.name },
      });
    }
  }

  for (const contact of doc.contacts) {
    const key = contact.name.trim().toLowerCase();
    if (seenContactNames.has(key)) {
      issues.push({
        level: "warning",
        code: "CONTACT_DUPLICATE",
        message: `Contact name ${contact.name} is duplicated.`,
        params: { name: contact.name },
      });
    }

    if (contact.callId <= 0 || contact.callId >= 16777216) {
      issues.push({
        level: "error",
        code: "CONTACT_CALL_ID_RANGE",
        message: `Contact ${contact.name} call ID must be 1-16777215.`,
        params: { name: contact.name },
      });
    }

    seenContactNames.add(key);
  }

  if (doc.settings.radioId <= 0) {
    issues.push({
      level: "error",
      code: "RADIO_ID_INVALID",
      message: "Radio ID must be positive.",
    });
  }

  if (doc.settings.voxSensitivity < 1 || doc.settings.voxSensitivity > 10) {
    issues.push({
      level: "error",
      code: "SETTINGS_VOX_RANGE",
      message: "VOX sensitivity must be between 1 and 10.",
    });
  }

  if (doc.settings.txPreambleDurationMs < 0 || doc.settings.txPreambleDurationMs > 8640) {
    issues.push({
      level: "error",
      code: "SETTINGS_TX_PREAMBLE_RANGE",
      message: "TX preamble duration must be between 0 and 8640 ms.",
    });
  }

  if (doc.settings.rxLowBatteryIntervalSec < 0 || doc.settings.rxLowBatteryIntervalSec > 635) {
    issues.push({
      level: "error",
      code: "SETTINGS_RX_LOW_BATTERY_RANGE",
      message: "RX low battery interval must be between 0 and 635 seconds.",
    });
  }

  return issues;
}

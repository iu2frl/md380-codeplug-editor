import type { CodeplugDocument, ValidationIssue } from "./types";

export function validateDocument(doc: CodeplugDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const channelIds = new Set(doc.channels.map((channel) => channel.id));
  const contactIds = new Set(doc.contacts.map((contact) => contact.id));
  const seenContactNames = new Set<string>();

  for (const zone of doc.zones) {
    for (const channelId of zone.channelIds) {
      if (!channelIds.has(channelId)) {
        issues.push({
          level: "error",
          code: "ZONE_CHANNEL_REFERENCE",
          message: `Zone ${zone.name} references missing channel #${channelId}.`,
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
      });
    }

    if (!(channel.rxFrequencyMHz > 0)) {
      issues.push({
        level: "error",
        code: "CHANNEL_RX_INVALID",
        message: `Channel ${channel.name} has invalid RX frequency.`,
      });
    }

    if (!(channel.txFrequencyMHz > 0)) {
      issues.push({
        level: "error",
        code: "CHANNEL_TX_INVALID",
        message: `Channel ${channel.name} has invalid TX frequency.`,
      });
    }

    if (channel.colorCode < 0 || channel.colorCode > 15) {
      issues.push({
        level: "error",
        code: "CHANNEL_COLOR_CODE_RANGE",
        message: `Channel ${channel.name} color code must be 0-15.`,
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
      });
    }

    if (contact.callId <= 0 || contact.callId >= 16777216) {
      issues.push({
        level: "error",
        code: "CONTACT_CALL_ID_RANGE",
        message: `Contact ${contact.name} call ID must be 1-16777215.`,
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

  return issues;
}

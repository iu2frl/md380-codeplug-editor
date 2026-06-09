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

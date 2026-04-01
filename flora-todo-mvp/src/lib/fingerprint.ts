import { createHash } from "node:crypto";
import { FollowupDraft, ReminderDraft } from "@/src/types/structured";

function hash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

export function buildSegmentHash(sourceChannel: string, sourceMessageId: string, segment: string) {
  return hash([sourceChannel, sourceMessageId, segment.trim().toLowerCase()].join("|"));
}

export function buildReminderSignature(reminder: ReminderDraft) {
  return hash([
    reminder.title,
    reminder.remindAt.toISOString(),
    reminder.kind,
    reminder.message ?? "",
  ].join("|"));
}

export function buildFollowupSignature(followup: FollowupDraft) {
  return hash([
    followup.subject,
    followup.followupType,
    followup.waitingFor ?? "",
    followup.nextCheckAt?.toISOString() ?? "",
    followup.status,
  ].join("|"));
}

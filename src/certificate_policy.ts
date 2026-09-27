import { z } from "zod";

export const participantSchema = z.object({
  participantId: z.string().min(1),
  name: z.string().min(1),
  programName: z.string().min(1),
  completed: z.boolean(),
  completionDate: z.string().date(),
  donorAmount: z.number().nonnegative().default(0),
  volunteerHours: z.number().nonnegative().default(0),
  campaign: z.string().min(1)
});

export const certificateBatchSchema = z.object({
  organizationName: z.string().min(1),
  participants: z.array(participantSchema).min(1).max(100)
});

export type CertificateBatch = z.infer<typeof certificateBatchSchema>;
export type Participant = z.infer<typeof participantSchema>;

export type ParticipantPlan = {
  participantId: string;
  certificate: "generate" | "skip";
  donorReceipt: "required" | "none";
  volunteerReminder: "send" | "none";
  campaign: string;
};

export function planParticipant(participant: Participant): ParticipantPlan {
  return {
    participantId: participant.participantId,
    certificate: participant.completed ? "generate" : "skip",
    donorReceipt: participant.donorAmount > 0 ? "required" : "none",
    volunteerReminder: !participant.completed && participant.volunteerHours > 0 ? "send" : "none",
    campaign: participant.campaign
  };
}

export function certificateMarkdown(organizationName: string, participant: Participant): string {
  return [
    `# Certificate of Completion`,
    "",
    `**${organizationName}** recognizes`,
    "",
    `## ${participant.name}`,
    "",
    `for completing **${participant.programName}** on ${participant.completionDate}.`,
    "",
    `Participant reference: ${participant.participantId}`
  ].join("\n");
}

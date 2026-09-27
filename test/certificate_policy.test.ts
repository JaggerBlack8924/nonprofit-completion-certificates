import assert from "node:assert/strict";
import test from "node:test";
import { planParticipant } from "../src/certificate_policy.js";

test("a completed donor gets a certificate and receipt without a reminder", () => {
  const plan = planParticipant({
    participantId: "p-1042",
    name: "Jordan Lee",
    programName: "Community Garden Leadership",
    completed: true,
    completionDate: "2026-08-28",
    donorAmount: 75,
    volunteerHours: 18,
    campaign: "summer-garden"
  });

  assert.deepEqual(plan, {
    participantId: "p-1042",
    certificate: "generate",
    donorReceipt: "required",
    volunteerReminder: "none",
    campaign: "summer-garden"
  });
});

test("an active volunteer who has not completed is reminded and gets no certificate", () => {
  const plan = planParticipant({
    participantId: "p-1043",
    name: "Sam Rivera",
    programName: "Community Garden Leadership",
    completed: false,
    completionDate: "2026-09-30",
    donorAmount: 0,
    volunteerHours: 7,
    campaign: "summer-garden"
  });

  assert.equal(plan.certificate, "skip");
  assert.equal(plan.donorReceipt, "none");
  assert.equal(plan.volunteerReminder, "send");
});

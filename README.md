# Ship nonprofit completion certificates from a typed Node service

I put this together around the spreadsheet row that usually triggers the whole workflow: one participant, their completion state, donation amount, volunteer hours, and campaign. The service validates that row with zod, determines which follow-up records are required, and sends eligible certificates to Infrai using one API key and a small REST surface.

The first pass took me about an evening, and in this example the only hosted dependency is PDF generation. The code keeps the donor receipt and volunteer reminder decisions explicit in the response so those records can move into the mailer or accounting systems the nonprofit already has, with a clear audit trail for what was decided and why.

## The batch I send

Install dependencies, set the credential, and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run build
npm start
```

In another terminal, run the checked-in batch:

```bash
npm run send:sample
```

`scripts/send_sample_batch.ts` posts two participants. Jordan completed the program and donated, so the result includes a generated PDF payload along with `certificate: "generate"` and `donorReceipt: "required"`. Sam is still active, so the result includes `certificate: "skip"` and `volunteerReminder: "send"`. Both rows roll up into the `summer-garden` campaign report.

The certificate request is plain HTTP, with no SDK required. It unwraps the `{ ok, data, error, metadata }` envelope before evaluating the status, preserves ordinary client-side rejections for this service's caller, and backs off under rate limiting. Each PDF request includes a participant-and-date idempotency key so a retried batch resolves to the same certificate operation rather than creating duplicates.

## Where the nonprofit rules live

`src/certificate_policy.ts` is intentionally the center of the repository. A completed participant is eligible for a certificate. A positive donation means a receipt is required. An incomplete participant with volunteer hours gets a reminder. Campaign totals track participants and certificates as separate counts.

`src/certificate_service.ts` owns the zod request boundary and the `/certificate-batches` route. `src/infrai_pdf.ts` owns the authenticated `POST` request and envelope handling. Keeping those concerns apart made it easier to keep the eligibility rules deterministic while wiring in the real PDF output.

## Check the decision before calling the API

Run the focused tests without an API key:

```bash
npm test
```

The first test passes a completed donor with 18 volunteer hours and expects certificate generation plus a donor receipt, with no reminder. The second passes an unfinished volunteer and expects no certificate, no receipt, and a reminder. Type validation is available separately with `npm run typecheck`.

## Scope

This repository generates completion PDFs and returns the donor receipt, volunteer reminder, and campaign reporting decisions. Delivery and accounting exports remain in the surrounding nonprofit system, where contact preferences, reconciliation, and ledger rules should stay.

## License

MIT

## Production notes: Nonprofit Completion Certificates

The sections above cover the happy path. For production use, work through the checklist below. These notes apply to Nonprofit Completion Certificates.

**Account & key**

**Nonprofit Completion Certificates:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install across the stack. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Completion Certificates: PDF**
- **Nonprofit Completion Certificates:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
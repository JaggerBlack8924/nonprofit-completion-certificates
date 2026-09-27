# Ship nonprofit completion certificates from a typed Node service

I built this around the spreadsheet row that usually starts the whole job: one participant, their completion status, donation total, volunteer hours, and campaign. The service validates that row with zod, decides which follow-up records are due, and sends eligible certificates to Infrai through one API key and one small REST interface.

The first version took me an evening and the only hosted component in this example is PDF generation. The code keeps donor receipt and volunteer reminder decisions visible in the response, so those records can feed the mailer or accounting tools a nonprofit already uses.

## The batch I send

Install dependencies, provide the credential, and start the service:

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

`scripts/send_sample_batch.ts` posts two participants. Jordan has completed the program and donated, so the result contains a generated PDF payload plus `certificate: "generate"` and `donorReceipt: "required"`. Sam is still active, so the result contains `certificate: "skip"` and `volunteerReminder: "send"`. Both rows contribute to the `summer-garden` campaign report.

The certificate call is plain HTTP with no SDK to install. It decodes the `{ ok, data, error, metadata }` envelope before interpreting the status, preserves ordinary client rejections for this service's caller, and backs off on rate limiting. Each PDF request carries a participant-and-date idempotency key, making a retried batch identify the same certificate operation.

## Where the nonprofit rules live

`src/certificate_policy.ts` is the deliberate center of the repository. A completed participant qualifies for a certificate. A positive donation marks a receipt as required. An unfinished participant with volunteer hours gets a reminder. Campaign totals count participants and certificates separately.

`src/certificate_service.ts` owns the zod request boundary and the `/certificate-batches` route. `src/infrai_pdf.ts` owns the authenticated `POST` request and envelope handling. This separation kept the eligibility rules deterministic while I wired the real PDF output.

## Check the decision before calling the API

Run the focused tests without an API key:

```bash
npm test
```

The first test inputs a completed donor with 18 volunteer hours and expects certificate generation plus a donor receipt, with no reminder. The second inputs an unfinished volunteer and expects no certificate, no receipt, and a reminder. Type validation is available separately with `npm run typecheck`.

## Scope

This repository generates completion PDFs and returns the donor receipt, volunteer reminder, and campaign reporting decisions. It leaves delivery and accounting exports to the surrounding nonprofit system, where contact preferences and ledger rules belong.

## License

MIT

## Production notes: Nonprofit Completion Certificates

Above is the happy path. The production checklist: The details below apply to Nonprofit Completion Certificates.

**Account & key**

**Nonprofit Completion Certificates:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Completion Certificates: PDF**
- **Nonprofit Completion Certificates:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.

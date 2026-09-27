import { createServer, type ServerResponse } from "node:http";
import { certificateBatchSchema, certificateMarkdown, planParticipant } from "./certificate_policy.js";
import { generateCertificatePdf, InfraiError } from "./infrai_pdf.js";

function reply(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/certificate-batches") {
    reply(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const parsed = certificateBatchSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) {
      reply(response, 400, { error: "Invalid request body", issues: parsed.error.issues });
      return;
    }

    const apiKey = process.env.INFRAI_API_KEY;
    if (!apiKey) {
      reply(response, 500, { error: "INFRAI_API_KEY is required" });
      return;
    }

    const plans = parsed.data.participants.map(planParticipant);
    const generated = await Promise.all(
      parsed.data.participants
        .filter((participant) => participant.completed)
        .map(async (participant) => ({
          participantId: participant.participantId,
          pdf: await generateCertificatePdf(
            apiKey,
            certificateMarkdown(parsed.data.organizationName, participant),
            `certificate-${participant.participantId}-${participant.completionDate}`
          )
        }))
    );

    const campaignReport = Object.values(
      plans.reduce<Record<string, { campaign: string; participants: number; certificates: number }>>((report, plan) => {
        const row = report[plan.campaign] ?? { campaign: plan.campaign, participants: 0, certificates: 0 };
        row.participants += 1;
        if (plan.certificate === "generate") row.certificates += 1;
        report[plan.campaign] = row;
        return report;
      }, {})
    );

    reply(response, 201, { generated, plans, campaignReport });
  } catch (error) {
    if (error instanceof SyntaxError) {
      reply(response, 400, { error: "Request body must be valid JSON" });
    } else if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      reply(response, error.status, { error: error.code, detail: error.detail });
    } else {
      reply(response, 502, { error: "Certificate generation failed" });
    }
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Certificate service listening on http://localhost:${port}`));

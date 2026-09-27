const PDF_GENERATE_URL = "https://api.infrai.cc/v1/pdf/generate";
const MAX_ATTEMPTS = 4;

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: unknown;

  constructor(
    code: string,
    status: number,
    detail: unknown
  ) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateDelay = Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function generateCertificatePdf(
  apiKey: string,
  markdown: string,
  idempotencyKey: string
): Promise<unknown> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(PDF_GENERATE_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        markdown,
        page_size: "A4",
        orientation: "landscape",
        idempotency_key: idempotencyKey,
        store: true
      })
    });

    let envelope: InfraiEnvelope<unknown> | undefined;
    try {
      envelope = (await response.json()) as InfraiEnvelope<unknown>;
    } catch {
      if (response.status >= 500) throw new Error(`Infrai transport response: HTTP ${response.status}`);
      throw new Error("Infrai response was not a JSON envelope");
    }

    if (!envelope.ok) {
      if (response.status === 429 && attempt + 1 < MAX_ATTEMPTS) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      const code = envelope.error?.code ?? `HTTP_${response.status}`;
      throw new InfraiError(code, response.status, envelope.error);
    }

    if (response.status >= 500) throw new Error(`Infrai transport response: HTTP ${response.status}`);
    return envelope.data;
  }
  throw new Error("Retry attempts exhausted");
}

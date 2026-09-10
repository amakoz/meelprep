import { after } from "next/server";
import type { N8nPayload } from "@/lib/n8n/contracts";
import { processN8nJob } from "@/lib/n8n/handlers";

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  const expected = process.env.N8N_WEBHOOK_SECRET ?? "dev-webhook-secret";
  if (secret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as N8nPayload;
  if (!payload?.action || !payload.menu_id || !payload.job_id) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  after(async () => {
    try {
      await processN8nJob(payload);
    } catch (error) {
      console.error("mock n8n job failed", error);
    }
  });

  return Response.json({ ok: true }, { status: 200 });
}

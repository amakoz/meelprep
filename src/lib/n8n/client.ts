import "server-only";

import { after } from "next/server";
import type { N8nPayload } from "@/lib/n8n/contracts";
import { processN8nJob } from "@/lib/n8n/handlers";

function webhookUrl() {
  return (
    process.env.N8N_WEBHOOK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/mock-n8n`
  );
}

function isLocalMock(url: string) {
  return url.includes("/api/mock-n8n");
}

export async function emitN8nJob(payload: N8nPayload) {
  const url = webhookUrl();

  if (isLocalMock(url)) {
    after(async () => {
      try {
        await processN8nJob(payload);
      } catch (error) {
        console.error("mock n8n job failed", error);
      }
    });
    return;
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret) headers["x-webhook-secret"] = secret;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `n8n webhook failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }
}

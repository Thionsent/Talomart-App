import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { processPendingTransactionalEmails } from "@/lib/email";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  if (!env.CRON_SECRET) return false;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes);
}

async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await processPendingTransactionalEmails(50);
  return Response.json({ ok: true, ...result });
}

export const GET = run;
export const POST = run;

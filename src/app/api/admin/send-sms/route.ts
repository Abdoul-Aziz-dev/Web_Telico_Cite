import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

// Minimal Twilio-like provider adapter placeholder
async function sendSmsViaProvider(_to: string, _body: string) {
  // This function should call the actual SMS provider SDK or HTTP API.
  // For now we'll simulate success.
  return { success: true, provider_id: `SIM-${Math.random().toString(16).slice(2,8)}` };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    // Basic selection: all clients with statut Actif
    const clients = await prisma.client.findMany({ where: { statut: "Actif" }, select: { telephone: true, nom: true, prenom: true } });

    const results: Array<{ to: string; ok: boolean }> = [];
    for (const c of clients) {
      if (!c.telephone) continue;
      try {
        const res = await sendSmsViaProvider(c.telephone, message);
        await prisma.smsLog.create({ data: { telephone: c.telephone, message, status: res.success ? "sent" : "failed", provider_id: res.provider_id || null, error: res.success ? null : JSON.stringify(res) } });
        results.push({ to: c.telephone, ok: !!res.success });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.smsLog.create({ data: { telephone: c.telephone, message, status: "error", error: msg } });
        results.push({ to: c.telephone, ok: false });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

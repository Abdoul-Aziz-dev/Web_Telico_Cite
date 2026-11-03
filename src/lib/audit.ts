import { cookies, headers } from "next/headers";
import { prisma } from "../../prisma/client";
import { verifySessionToken } from "./session";

export async function logAudit(action: string, details: string) {
  const user = await verifySessionToken(cookies().get("user_session")?.value);
  const ip = headers().get("x-forwarded-for") ?? headers().get("x-real-ip") ?? "inconnue";
  await prisma.auditLog.create({
    data: {
      utilisateur: user?.login ?? "Anonyme",
      id_user: user?.id_user,
      action,
      details,
      ip,
    },
  });
}

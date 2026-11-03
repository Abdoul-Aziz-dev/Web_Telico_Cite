export type SessionUser = {
  id_user: number;
  nom: string;
  prenom: string;
  login: string;
  role: "gerant" | "visiteur";
  exp: number;
};

const SESSION_COOKIE = "user_session";
const SESSION_MAX_AGE = 60 * 60 * 12;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET doit être configuré en production.");
    }
    return "telico-local-development-secret-change-before-deploy";
  }
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET doit contenir au moins 32 caractères.");
  }
  return secret;
}

function encodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSigningKey(usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function createSessionToken(
  user: Omit<SessionUser, "exp">,
) {
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const encodedPayload = encodeBytes(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(["sign"]),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${encodeBytes(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");
    if (!encodedPayload || !encodedSignature || extra) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(["verify"]),
      decodeBytes(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;
    const payload: unknown = JSON.parse(new TextDecoder().decode(decodeBytes(encodedPayload)));
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("id_user" in payload) ||
      !("nom" in payload) ||
      !("prenom" in payload) ||
      !("login" in payload) ||
      !("role" in payload) ||
      !("exp" in payload)
    ) return null;

    const session = payload as SessionUser;
    if (
      !Number.isInteger(session.id_user) ||
      typeof session.nom !== "string" ||
      typeof session.prenom !== "string" ||
      typeof session.login !== "string" ||
      (session.role !== "gerant" && session.role !== "visiteur") ||
      !Number.isInteger(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: {
  cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void };
}, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "../../../../lib/session";

const NO_CACHE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const cookieStore = cookies();
    const user = await verifySessionToken(cookieStore.get("user_session")?.value);
    if (!user) {
      return NextResponse.json({ user: null }, { headers: NO_CACHE });
    }
    const { exp: _exp, ...publicUser } = user;
    return NextResponse.json({ user: publicUser }, { headers: NO_CACHE });
  } catch {
    return NextResponse.json({ user: null }, { headers: NO_CACHE });
  }
}

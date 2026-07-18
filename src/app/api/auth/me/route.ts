import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get("user_session");
    if (!session) {
      return NextResponse.json({ user: null });
    }
    const user = JSON.parse(session.value);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}

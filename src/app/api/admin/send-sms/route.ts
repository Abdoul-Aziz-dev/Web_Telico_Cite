import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json(
    { error: "Envoi SMS indisponible : aucun fournisseur SMS n'est configuré. Aucun message n'a été envoyé." },
    { status: 503 },
  );
}

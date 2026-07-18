import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const chambre = await prisma.chambre.findUnique({ where: { id_chambre: id } });
    if (!chambre) return NextResponse.json({ error: 'Chambre non trouvée' }, { status: 404 });
    return NextResponse.json({ chambre });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture chambre' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const updated = await prisma.chambre.update({ where: { id_chambre: id }, data: body });
    return NextResponse.json({ chambre: updated });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour chambre' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await prisma.chambre.delete({ where: { id_chambre: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression chambre' }, { status: 500 });
  }
}

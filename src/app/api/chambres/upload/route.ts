import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const id_chambre = parseInt(formData.get("id_chambre") as string);

    if (!file || !id_chambre) {
      return NextResponse.json({ error: "Fichier ou ID manquant" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      return NextResponse.json({ error: "Format non supporté (jpg, png, webp)" }, { status: 400 });
    }

    const filename = `chambre-${id_chambre}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(process.cwd(), "public", "chambres", filename);
    await writeFile(filepath, buffer);

    const photoUrl = `/chambres/${filename}`;
    await prisma.chambre.update({ where: { id_chambre }, data: { photo: photoUrl } });

    return NextResponse.json({ photo: photoUrl });
  } catch (e) {
    return NextResponse.json({ error: "Erreur upload photo" }, { status: 500 });
  }
}

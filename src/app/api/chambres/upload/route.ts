import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const id_chambre = Number(formData.get("id_chambre"));

    if (!file || !Number.isInteger(id_chambre) || id_chambre <= 0) {
      return NextResponse.json({ error: "Fichier ou ID manquant" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const supportedTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    if (!ext || supportedTypes[ext] !== file.type) {
      return NextResponse.json({ error: "Format non supporté (jpg, png, webp)" }, { status: 400 });
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image doit faire moins de 5 Mo" }, { status: 413 });
    }
    const room = await prisma.chambre.findUnique({ where: { id_chambre } });
    if (!room) return NextResponse.json({ error: "Chambre introuvable" }, { status: 404 });

    const filename = `chambre-${id_chambre}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const isWebp = buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    if (!(isJpeg || isPng || isWebp)) {
      return NextResponse.json({ error: "Le contenu du fichier n'est pas une image valide" }, { status: 400 });
    }
    const filepath = path.join(process.cwd(), "public", "chambres", filename);
    let fileCreated = false;
    try {
      await mkdir(path.dirname(filepath), { recursive: true });
      await writeFile(filepath, buffer, { flag: "wx" });
      fileCreated = true;
      const photoUrl = `/chambres/${filename}`;
      await prisma.chambre.update({ where: { id_chambre }, data: { photo: photoUrl } });
      return NextResponse.json({ photo: photoUrl });
    } catch (error) {
      if (fileCreated) await unlink(filepath);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur upload photo: ${message}` }, { status: 500 });
  }
}

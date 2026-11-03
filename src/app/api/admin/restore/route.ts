import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import { createSessionToken, verifySessionToken, setSessionCookie } from "../../../../lib/session";

type BackupRow = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRowArray(value: unknown): value is BackupRow[] {
  return Array.isArray(value) && value.every(
    (row) => typeof row === "object" && row !== null && !Array.isArray(row),
  );
}

function toDate(value: unknown, nullable = false): Date | null {
  if (nullable && (value === null || value === undefined)) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("Une date de la sauvegarde est invalide.");
  return date;
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

export async function POST(req: Request) {
  try {
    const user = await verifySessionToken(cookies().get("user_session")?.value);
    if (!user || user.role !== "gerant") {
      return NextResponse.json({ error: "Accès réservé à l'administration." }, { status: 403 });
    }

    const body: unknown = await req.json();
    if (!isRecord(body) || !("backupData" in body)) {
      return NextResponse.json({ error: "Données de sauvegarde invalides." }, { status: 400 });
    }
    const backupData = body.backupData;
    if (
      !isRecord(backupData) ||
      !isRecord(backupData.meta) ||
      backupData.meta.version !== "2.0"
    ) {
      return NextResponse.json(
        { error: "Format de sauvegarde incompatible. Téléchargez une nouvelle sauvegarde complète." },
        { status: 400 },
      );
    }

    const tableNames = [
      "users", "clients", "chambres", "contrats", "contratChambres", "paiements",
      "paiementsArchives", "depenses", "depensesArchives", "clotures", "auditLogs",
      "connexionLogs", "demandesContact", "relances", "appConfigs", "smsLogs",
    ] as const;
    if (!tableNames.every((name) => name in backupData && isRowArray(backupData[name]))) {
      return NextResponse.json({ error: "La sauvegarde est incomplète ou corrompue." }, { status: 400 });
    }

    const backup = backupData as Record<(typeof tableNames)[number], BackupRow[]> & {
      meta: { version: string };
    };
    const requiredFields: Record<(typeof tableNames)[number], string[]> = {
      users: ["id_user", "nom", "prenom", "login", "mot_de_passe", "role"],
      clients: ["id_client", "nom", "prenom", "sexe", "telephone", "profession", "id_chambre", "date_entree", "statut"],
      chambres: ["id_chambre", "numero", "type_chambre", "prix", "statut", "photo"],
      contrats: ["id_contrat", "id_client", "date_debut", "date_fin", "montant"],
      contratChambres: ["id_contrat", "id_chambre"],
      paiements: ["id_paiement", "id_client", "id_contrat", "date_paiement", "mois_paye", "mois_ym", "montant", "statut", "numero_recu"],
      paiementsArchives: ["id_paiement", "id_client", "id_contrat", "date_paiement", "mois_paye", "mois_ym", "montant", "statut", "numero_recu"],
      depenses: ["id_depense", "libelle", "montant", "date_depense"],
      depensesArchives: ["id_depense", "libelle", "montant", "date_depense"],
      clotures: ["id_cloture", "mois", "date_cloture", "total_du", "total_encaisse", "total_depense", "solde", "statut", "valide_par", "commentaire"],
      auditLogs: ["id_audit", "date_action", "utilisateur", "id_user", "action", "details", "ip"],
      connexionLogs: ["id_connexion", "id_user", "login", "nom", "prenom", "role", "date_connexion", "ip", "action"],
      demandesContact: ["id_demande", "nom", "email", "type_chambre", "message", "date_demande", "traitee"],
      relances: ["id_relance", "id_client", "mois", "date_relance", "note"],
      appConfigs: ["cle", "valeur"],
      smsLogs: ["id_sms", "telephone", "message", "status", "provider_id", "error", "created_at"],
    };
    const dateFields: Partial<Record<(typeof tableNames)[number], string[]>> = {
      clients: ["date_entree"],
      contrats: ["date_debut", "date_fin"],
      paiements: ["date_paiement"],
      paiementsArchives: ["date_paiement"],
      depenses: ["date_depense"],
      depensesArchives: ["date_depense"],
      clotures: ["date_cloture"],
      auditLogs: ["date_action"],
      connexionLogs: ["date_connexion"],
      demandesContact: ["date_demande"],
      relances: ["date_relance"],
      smsLogs: ["created_at"],
    };
    const nullableDateFields: Partial<Record<(typeof tableNames)[number], string[]>> = {
      contrats: ["date_fin"],
      paiementsArchives: ["date_paiement"],
      depensesArchives: ["date_depense"],
    };
    const malformedRows = tableNames.some((name) =>
      backup[name].some((row) =>
        requiredFields[name].some((field) => !(field in row)) ||
        (dateFields[name] ?? []).some((field) => {
          try {
            toDate(row[field], (nullableDateFields[name] ?? []).includes(field));
            return false;
          } catch {
            return true;
          }
        }),
      ),
    );
    if (malformedRows) {
      return NextResponse.json({ error: "La sauvegarde contient des enregistrements incomplets ou invalides." }, { status: 400 });
    }

    const restoredAdmin = backup.users.find(
      (row) => row.login === user.login && row.role === "gerant" &&
        Number.isInteger(Number(row.id_user)) &&
        typeof row.nom === "string" && typeof row.prenom === "string",
    );
    if (!restoredAdmin) {
      return NextResponse.json(
        { error: "La sauvegarde ne contient pas le compte administrateur actuellement connecté." },
        { status: 400 },
      );
    }

    const ip = headers().get("x-forwarded-for") ?? headers().get("x-real-ip") ?? "inconnue";
    await prisma.$transaction(async (tx) => {
      await tx.paiement.deleteMany();
      await tx.contratChambre.deleteMany();
      await tx.contrat.deleteMany();
      await tx.client.deleteMany();
      await tx.depense.deleteMany();
      await tx.depenseArchive.deleteMany();
      await tx.paiementArchive.deleteMany();
      await tx.cloture.deleteMany();
      await tx.demandeContact.deleteMany();
      await tx.relanceLoyer.deleteMany();
      await tx.smsLog.deleteMany();
      await tx.connexionLog.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.appConfig.deleteMany();
      await tx.chambre.deleteMany();
      await tx.user.deleteMany();

      if (backup.users.length) {
        await tx.user.createMany({
          data: backup.users.map((row) => ({
            id_user: Number(row.id_user),
            nom: String(row.nom),
            prenom: String(row.prenom),
            login: String(row.login),
            mot_de_passe: String(row.mot_de_passe),
            role: String(row.role),
          })),
        });
      }
      if (backup.chambres.length) {
        await tx.chambre.createMany({
          data: backup.chambres.map((row) => ({
            id_chambre: Number(row.id_chambre),
            numero: String(row.numero),
            type_chambre: String(row.type_chambre),
            prix: Number(row.prix),
            statut: String(row.statut),
            photo: nullableString(row.photo),
          })),
        });
      }
      if (backup.clients.length) {
        await tx.client.createMany({
          data: backup.clients.map((row) => ({
            id_client: Number(row.id_client),
            nom: String(row.nom),
            prenom: String(row.prenom),
            sexe: String(row.sexe),
            telephone: nullableString(row.telephone),
            profession: nullableString(row.profession),
            id_chambre: row.id_chambre === null || row.id_chambre === undefined ? null : Number(row.id_chambre),
            date_entree: toDate(row.date_entree)!,
            statut: String(row.statut),
          })),
        });
      }
      if (backup.contrats.length) {
        await tx.contrat.createMany({
          data: backup.contrats.map((row) => ({
            id_contrat: Number(row.id_contrat),
            id_client: Number(row.id_client),
            date_debut: toDate(row.date_debut)!,
            date_fin: toDate(row.date_fin, true),
            montant: Number(row.montant),
          })),
        });
      }
      if (backup.contratChambres.length) {
        await tx.contratChambre.createMany({
          data: backup.contratChambres.map((row) => ({
            id_contrat: Number(row.id_contrat),
            id_chambre: Number(row.id_chambre),
          })),
        });
      }
      if (backup.paiements.length) {
        await tx.paiement.createMany({
          data: backup.paiements.map((row) => ({
            id_paiement: Number(row.id_paiement),
            id_client: Number(row.id_client),
            id_contrat: row.id_contrat === null || row.id_contrat === undefined ? null : Number(row.id_contrat),
            date_paiement: toDate(row.date_paiement)!,
            mois_paye: String(row.mois_paye),
            mois_ym: nullableString(row.mois_ym),
            montant: Number(row.montant),
            statut: String(row.statut),
            numero_recu: String(row.numero_recu),
          })),
        });
      }
      if (backup.paiementsArchives.length) {
        await tx.paiementArchive.createMany({
          data: backup.paiementsArchives.map((row) => ({
            id_paiement: Number(row.id_paiement),
            id_client: row.id_client == null ? null : Number(row.id_client),
            id_contrat: row.id_contrat == null ? null : Number(row.id_contrat),
            date_paiement: toDate(row.date_paiement, true),
            mois_paye: nullableString(row.mois_paye),
            mois_ym: nullableString(row.mois_ym),
            montant: row.montant == null ? null : Number(row.montant),
            statut: nullableString(row.statut),
            numero_recu: nullableString(row.numero_recu),
          })),
        });
      }
      if (backup.depenses.length) {
        await tx.depense.createMany({
          data: backup.depenses.map((row) => ({
            id_depense: Number(row.id_depense),
            libelle: String(row.libelle),
            montant: Number(row.montant),
            date_depense: toDate(row.date_depense)!,
          })),
        });
      }
      if (backup.depensesArchives.length) {
        await tx.depenseArchive.createMany({
          data: backup.depensesArchives.map((row) => ({
            id_depense: Number(row.id_depense),
            libelle: nullableString(row.libelle),
            montant: row.montant == null ? null : Number(row.montant),
            date_depense: toDate(row.date_depense, true),
          })),
        });
      }
      if (backup.clotures.length) {
        await tx.cloture.createMany({
          data: backup.clotures.map((row) => ({
            id_cloture: Number(row.id_cloture),
            mois: String(row.mois),
            date_cloture: toDate(row.date_cloture)!,
            total_du: Number(row.total_du),
            total_encaisse: Number(row.total_encaisse),
            total_depense: Number(row.total_depense),
            solde: Number(row.solde),
            statut: String(row.statut),
            valide_par: nullableString(row.valide_par),
            commentaire: nullableString(row.commentaire),
          })),
        });
      }
      if (backup.demandesContact.length) {
        await tx.demandeContact.createMany({
          data: backup.demandesContact.map((row) => ({
            id_demande: Number(row.id_demande),
            nom: String(row.nom),
            email: String(row.email),
            type_chambre: String(row.type_chambre),
            message: String(row.message),
            date_demande: toDate(row.date_demande)!,
            traitee: Boolean(row.traitee),
          })),
        });
      }
      if (backup.relances.length) {
        await tx.relanceLoyer.createMany({
          data: backup.relances.map((row) => ({
            id_relance: Number(row.id_relance),
            id_client: Number(row.id_client),
            mois: String(row.mois),
            date_relance: toDate(row.date_relance)!,
            note: nullableString(row.note),
          })),
        });
      }
      if (backup.appConfigs.length) {
        await tx.appConfig.createMany({
          data: backup.appConfigs.map((row) => ({
            cle: String(row.cle),
            valeur: nullableString(row.valeur),
          })),
        });
      }
      if (backup.smsLogs.length) {
        await tx.smsLog.createMany({
          data: backup.smsLogs.map((row) => ({
            id_sms: Number(row.id_sms),
            telephone: String(row.telephone),
            message: String(row.message),
            status: String(row.status),
            provider_id: nullableString(row.provider_id),
            error: nullableString(row.error),
            created_at: toDate(row.created_at)!,
          })),
        });
      }
      if (backup.connexionLogs.length) {
        await tx.connexionLog.createMany({
          data: backup.connexionLogs.map((row) => ({
            id_connexion: Number(row.id_connexion),
            id_user: Number(row.id_user),
            login: String(row.login),
            nom: String(row.nom),
            prenom: String(row.prenom),
            role: String(row.role),
            date_connexion: toDate(row.date_connexion)!,
            ip: nullableString(row.ip),
            action: String(row.action),
          })),
        });
      }
      if (backup.auditLogs.length) {
        await tx.auditLog.createMany({
          data: backup.auditLogs.map((row) => ({
            id_audit: Number(row.id_audit),
            date_action: toDate(row.date_action)!,
            utilisateur: nullableString(row.utilisateur),
            id_user: row.id_user == null ? null : Number(row.id_user),
            action: String(row.action),
            details: nullableString(row.details),
            ip: nullableString(row.ip),
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          utilisateur: String(restoredAdmin.login),
          id_user: Number(restoredAdmin.id_user),
          action: "RESTAURATION",
          details: `Sauvegarde complète restaurée (${backup.clients.length} locataires, ${backup.paiements.length} paiements)`,
          ip,
        },
      });
    }, { timeout: 60000 });

    const response = NextResponse.json({
      success: true,
      message: "La base a été restaurée. Les comptes, données et journaux correspondent à la sauvegarde.",
    });
    setSessionCookie(response, await createSessionToken({
      id_user: Number(restoredAdmin.id_user),
      nom: String(restoredAdmin.nom),
      prenom: String(restoredAdmin.prenom),
      login: String(restoredAdmin.login),
      role: "gerant",
    }));
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur lors de la restauration: ${message}` }, { status: 500 });
  }
}

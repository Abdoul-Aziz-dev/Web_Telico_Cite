import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    include: {
      chambre: true,
      contrats: true,
      paiements: true
    },
    orderBy: { id_client: "desc" }
  });
  console.log("=== TOTAL CLIENTS DANS LA BASE ===", clients.length);
  console.dir(clients, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

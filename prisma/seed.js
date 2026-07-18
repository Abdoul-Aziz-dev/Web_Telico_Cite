const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Démarrage du seed...');

  // Vérifie si l'admin existe déjà
  const existing = await prisma.user.findUnique({ where: { login: 'Aziz' } });

  if (existing) {
    console.log('✅ Compte admin "Aziz" existe déjà. Rien à faire.');
    return;
  }

  const hash = await bcrypt.hash('Aziz224@2026', 10);

  await prisma.user.create({
    data: {
      nom: 'Diallo',
      prenom: 'Aziz',
      login: 'Aziz',
      mot_de_passe: hash,
      role: 'gerant',
    },
  });

  console.log('✅ Compte admin créé avec succès !');
  console.log('   Login    : Aziz');
  console.log('   Password : Aziz224@2026');
  console.log('   Rôle     : gerant');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

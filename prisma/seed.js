const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Démarrage du seed...');

  const login = process.env.ADMIN_LOGIN;
  const password = process.env.ADMIN_PASSWORD;
  const nom = process.env.ADMIN_NOM;
  const prenom = process.env.ADMIN_PRENOM;
  if (!login || !password || !nom || !prenom || password.length < 12) {
    throw new Error('Définissez ADMIN_LOGIN, ADMIN_PASSWORD (12 caractères minimum), ADMIN_NOM et ADMIN_PRENOM avant de lancer le seed.');
  }

  const existing = await prisma.user.findUnique({ where: { login } });

  if (existing) {
    console.log(`✅ Le compte admin "${login}" existe déjà. Rien à faire.`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      nom,
      prenom,
      login,
      mot_de_passe: hash,
      role: 'gerant',
    },
  });

  console.log('✅ Compte admin créé avec succès !');
  console.log(`   Login    : ${login}`);
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

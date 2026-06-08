import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Show current distinct owners so we can verify before updating
  const owners = await prisma.opportunity.findMany({
    select: { owner: true },
    distinct: ['owner'],
    orderBy: { owner: 'asc' },
  });
  console.log('\n=== Owners actuales ===');
  owners.forEach(o => console.log(' -', o.owner));

  // --- Fix 1: Sergio Rodríguez → Sergio Daniel Muñoz ---
  const r1 = await prisma.opportunity.updateMany({
    where: { owner: 'Sergio Rodríguez' },
    data:  { owner: 'Sergio Daniel Muñoz' },
  });
  console.log(`\n[Fix 1] Sergio Rodríguez → Sergio Daniel Muñoz: ${r1.count} registros actualizados`);

  // --- Fix 2: JML director → JML ---
  const r2 = await prisma.opportunity.updateMany({
    where: { owner: 'JML director' },
    data:  { owner: 'JML' },
  });
  console.log(`[Fix 2] JML director → JML: ${r2.count} registros actualizados`);

  // --- Fix 3: Variants of "Dani" with "Kenia" or similar → Dani Alonso ---
  // Use raw query to do a case-insensitive LIKE match
  const r3 = await prisma.$executeRaw`
    UPDATE opportunities
    SET owner = 'Dani Alonso'
    WHERE owner ILIKE '%dani%kenia%'
       OR owner ILIKE '%dani a%'
       OR owner = 'Dani A'
  `;
  console.log(`[Fix 3] Variantes de Dani → Dani Alonso: ${r3} registros actualizados`);

  // Show updated owners list
  const ownersAfter = await prisma.opportunity.findMany({
    select: { owner: true },
    distinct: ['owner'],
    orderBy: { owner: 'asc' },
  });
  console.log('\n=== Owners después de la limpieza ===');
  ownersAfter.forEach(o => console.log(' -', o.owner));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

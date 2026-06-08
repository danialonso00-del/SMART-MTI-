/**
 * scripts/import-material-costs.js
 * Reads the CSV index file and updates each project's materialCost field.
 * Also clears the `costs` field (which was incorrectly populated from the
 * "Next Years" or "COSTS MATERIAL" column during initial seeding).
 *
 * CSV column layout (0-indexed):
 *  0  ID
 *  5  AMOUNT
 * 33  Next Years (future billing, NOT a cost)
 * 34  COSTS MATERIAL  ← this is the real materialCost
 * 37  MARGIN
 *
 * Run: node scripts/import-material-costs.js
 */

const { PrismaClient } = require('@prisma/client');
const fs   = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function parseEuroNumber(str) {
  if (!str) return 0;
  const s = str.trim();
  if (!s || s === '-' || s === '' || s === '0') return 0;
  // European format: 1.234,56 → 1234.56
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

async function main() {
  const csvPath = path.join(
    'C:\\Users\\Dani\\Downloads', '¡¡INDICE 2026!! MTI_v01(MTI).csv',
  );

  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found at:', csvPath);
    process.exit(1);
  }

  // Try UTF-8 first, fall back to latin1
  let content;
  try {
    content = fs.readFileSync(csvPath, 'utf-8');
  } catch {
    content = fs.readFileSync(csvPath, 'latin1');
  }

  const lines = content.split(/\r?\n/);
  let updated = 0;
  let skipped = 0;

  for (const line of lines) {
    const cols = line.split(';');
    const id   = cols[0]?.trim();

    // Only process rows with a valid project ID like "25-002", "26-012", "000-MTI"
    if (!id || id === '-' || !id.match(/^[\w]+-\d{3}/) && !id.match(/^\d{2}-\d{3}/)) {
      continue;
    }
    // Skip separator / total rows
    if (id.startsWith('Total') || id.startsWith('total')) continue;

    const materialCost = parseEuroNumber(cols[34]);

    try {
      const existing = await prisma.opportunity.findUnique({ where: { id } });
      if (!existing) {
        skipped++;
        continue;
      }

      await prisma.opportunity.update({
        where: { id },
        data: {
          materialCost,
          costs: 0, // clear the incorrectly-mapped field; user edits "otros costes" in UI
        },
      });

      console.log(`  [OK] ${id.padEnd(10)} materialCost = ${materialCost.toFixed(2)}`);
      updated++;
    } catch (err) {
      console.error(`  [ERR] ${id}: ${err.message}`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (not in DB): ${skipped}`);
  await prisma.$disconnect();
}

main().catch(async err => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

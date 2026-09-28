const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find NFST and NOS schemes
  const schemes = await prisma.scheme.findMany();
  const nfst = schemes.find(s => s.name.includes('NFST'));
  const nos = schemes.find(s => s.name.includes('NOS'));

  if (!nfst && !nos) {
    console.log('No NFST or NOS schemes found. Skipping selection criteria seed.');
    return;
  }

  // Seed selection criteria
  if (nfst) {
    // Update totalSeats
    await prisma.scheme.update({ where: { id: nfst.id }, data: { totalSeats: 5 } });

    // Get application fields for NFST
    const nfstFields = await prisma.schemeApplicationField.findMany({ where: { schemeId: nfst.id } });
    const marksField = nfstFields.find(f => f.fieldLabel.toLowerCase().includes('mark') || f.fieldLabel.toLowerCase().includes('percentage'));
    const incomeField = nfstFields.find(f => f.fieldLabel.toLowerCase().includes('income'));

    // Clear existing criteria
    await prisma.schemeSelectionCriteria.deleteMany({ where: { schemeId: nfst.id } });

    await prisma.schemeSelectionCriteria.createMany({
      data: [
        {
          schemeId: nfst.id,
          criteriaName: 'Academic Marks',
          fieldSource: marksField ? marksField.fieldLabel : 'Percentage of Marks',
          weightage: 0.7,
          scoreDirection: 'HIGHER_IS_BETTER',
        },
        {
          schemeId: nfst.id,
          criteriaName: 'Family Income',
          fieldSource: incomeField ? incomeField.fieldLabel : 'Annual Family Income',
          weightage: 0.3,
          scoreDirection: 'LOWER_IS_BETTER',
        },
      ],
    });
    console.log('Seeded NFST selection criteria: 70% Academic Marks + 30% Family Income, totalSeats=5');
  }

  if (nos) {
    await prisma.scheme.update({ where: { id: nos.id }, data: { totalSeats: 3 } });

    const nosFields = await prisma.schemeApplicationField.findMany({ where: { schemeId: nos.id } });
    const marksField = nosFields.find(f => f.fieldLabel.toLowerCase().includes('mark') || f.fieldLabel.toLowerCase().includes('percentage'));
    const incomeField = nosFields.find(f => f.fieldLabel.toLowerCase().includes('income'));

    await prisma.schemeSelectionCriteria.deleteMany({ where: { schemeId: nos.id } });

    await prisma.schemeSelectionCriteria.createMany({
      data: [
        {
          schemeId: nos.id,
          criteriaName: 'Academic Marks',
          fieldSource: marksField ? marksField.fieldLabel : 'Percentage of Marks',
          weightage: 0.6,
          scoreDirection: 'HIGHER_IS_BETTER',
        },
        {
          schemeId: nos.id,
          criteriaName: 'Family Income',
          fieldSource: incomeField ? incomeField.fieldLabel : 'Annual Family Income',
          weightage: 0.4,
          scoreDirection: 'LOWER_IS_BETTER',
        },
      ],
    });
    console.log('Seeded NOS selection criteria: 60% Academic Marks + 40% Family Income, totalSeats=3');
  }

  console.log('Selection criteria seeding complete.');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

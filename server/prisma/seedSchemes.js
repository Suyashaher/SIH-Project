const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // === NFST (National Fellowship for Scheduled Tribe) ===
  const nfst = await prisma.scheme.create({
    data: {
      name: 'National Fellowship for Scheduled Tribe (NFST)',
      description: 'Fellowship for ST students pursuing M.Phil/Ph.D in Indian universities. Provides financial assistance to ST scholars for higher education.',
      isActive: true,
      eligibilityRules: {
        create: [
          { fieldName: 'category', operator: 'EQUALS', value: 'ST' },
          { fieldName: 'income', operator: 'LESS_THAN', value: '250000' },
          { fieldName: 'marks', operator: 'GREATER_THAN_OR_EQUAL', value: '55' },
        ],
      },
      documentRequirements: {
        create: [
          { documentName: 'ST Caste Certificate', isMandatory: true },
          { documentName: 'Income Certificate', isMandatory: true },
          { documentName: 'Admission Letter (M.Phil/Ph.D)', isMandatory: true },
          { documentName: 'Marksheet of qualifying examination', isMandatory: true },
        ],
      },
      applicationFields: {
        create: [
          { fieldLabel: 'Full Name', fieldType: 'TEXT', isRequired: true, displayOrder: 0 },
          { fieldLabel: 'Date of Birth', fieldType: 'DATE', isRequired: true, displayOrder: 1 },
          { fieldLabel: 'Course Name', fieldType: 'DROPDOWN', isRequired: true, options: 'M.Phil,Ph.D', displayOrder: 2 },
          { fieldLabel: 'University Name', fieldType: 'TEXT', isRequired: true, displayOrder: 3 },
          { fieldLabel: 'Annual Family Income', fieldType: 'NUMBER', isRequired: true, displayOrder: 4 },
          { fieldLabel: 'Research Topic', fieldType: 'TEXT', isRequired: false, displayOrder: 5 },
        ],
      },
    },
  });

  console.log('NFST scheme seeded:', nfst.id);

  // === NOS (National Overseas Scholarship) ===
  const nos = await prisma.scheme.create({
    data: {
      name: 'National Overseas Scholarship (NOS)',
      description: 'Scholarship for selected ST students for pursuing Masters and Ph.D level courses abroad. Provides financial support for overseas education.',
      isActive: true,
      eligibilityRules: {
        create: [
          { fieldName: 'category', operator: 'IN', value: 'ST,DNT,Semi-Nomadic' },
          { fieldName: 'income', operator: 'LESS_THAN', value: '600000' },
          { fieldName: 'age', operator: 'LESS_THAN', value: '35' },
        ],
      },
      documentRequirements: {
        create: [
          { documentName: 'ST/DNT Certificate', isMandatory: true },
          { documentName: 'Income Certificate', isMandatory: true },
          { documentName: 'Admission Letter from Foreign University', isMandatory: true },
          { documentName: 'Passport Copy', isMandatory: true },
          { documentName: 'IELTS/TOEFL Score Report', isMandatory: false },
        ],
      },
      applicationFields: {
        create: [
          { fieldLabel: 'Full Name', fieldType: 'TEXT', isRequired: true, displayOrder: 0 },
          { fieldLabel: 'Date of Birth', fieldType: 'DATE', isRequired: true, displayOrder: 1 },
          { fieldLabel: 'Country of Study', fieldType: 'TEXT', isRequired: true, displayOrder: 2 },
          { fieldLabel: 'University Name', fieldType: 'TEXT', isRequired: true, displayOrder: 3 },
          { fieldLabel: 'Course Level', fieldType: 'DROPDOWN', isRequired: true, options: 'Masters,Ph.D,Post-Doctoral', displayOrder: 4 },
          { fieldLabel: 'Subject/Field of Study', fieldType: 'TEXT', isRequired: true, displayOrder: 5 },
          { fieldLabel: 'Annual Family Income', fieldType: 'NUMBER', isRequired: true, displayOrder: 6 },
          { fieldLabel: 'Passport Number', fieldType: 'TEXT', isRequired: true, displayOrder: 7 },
        ],
      },
    },
  });

  console.log('NOS scheme seeded:', nos.id);
  console.log('\nScheme seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

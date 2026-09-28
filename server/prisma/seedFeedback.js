const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Seed DocumentTypeThreshold for known document types
  const docTypes = ['ST Certificate', 'Income Certificate', 'Admission Letter', 'Marksheet'];
  for (const dt of docTypes) {
    await prisma.documentTypeThreshold.upsert({
      where: { documentType: dt },
      update: {},
      create: { documentType: dt, currentConfidenceThreshold: 80, previousThreshold: 80 },
    });
  }
  console.log('Seeded DocumentTypeThreshold for:', docTypes.join(', '));

  // Seed synthetic AIFeedbackLog entries (~80 entries)
  const feedbackData = [
    // Income Certificate: HIGH override rate (~45%) — AI is too aggressive
    ...Array.from({ length: 30 }, (_, i) => ({
      applicationDocumentId: `demo-doc-income-${i}`,
      documentType: 'Income Certificate',
      originalAiStatus: 'FLAGGED',
      originalConfidenceScore: 55 + Math.random() * 30,
      originalMatchResult: JSON.stringify({ income: { match: false, expected: '200000', found: '2,00,000', similarityScore: 0.4 } }),
      officerFinalStatus: i < 14 ? 'VERIFIED' : 'FLAGGED', // 14/30 = ~47% overridden
      overrideReason: i < 14 ? 'Income format mismatch — values are actually the same' : null,
      officerId: 'demo-officer-1',
      wasOverridden: i < 14,
    })),
    // ST Certificate: LOW override rate (~8%) — AI is reliable
    ...Array.from({ length: 25 }, (_, i) => ({
      applicationDocumentId: `demo-doc-st-${i}`,
      documentType: 'ST Certificate',
      originalAiStatus: i < 20 ? 'VERIFIED' : 'FLAGGED',
      originalConfidenceScore: 70 + Math.random() * 25,
      originalMatchResult: JSON.stringify({ name: { match: true, similarityScore: 0.95 } }),
      officerFinalStatus: i < 20 ? 'VERIFIED' : (i < 22 ? 'VERIFIED' : 'FLAGGED'),
      overrideReason: (i >= 20 && i < 22) ? 'Minor OCR error, document is valid' : null,
      officerId: 'demo-officer-1',
      wasOverridden: i >= 20 && i < 22, // 2/25 = 8%
    })),
    // Admission Letter: MEDIUM override rate (~20%)
    ...Array.from({ length: 15 }, (_, i) => ({
      applicationDocumentId: `demo-doc-admission-${i}`,
      documentType: 'Admission Letter',
      originalAiStatus: 'FLAGGED',
      originalConfidenceScore: 60 + Math.random() * 20,
      originalMatchResult: JSON.stringify({ university: { match: false, similarityScore: 0.7 } }),
      officerFinalStatus: i < 3 ? 'VERIFIED' : 'FLAGGED', // 3/15 = 20%
      overrideReason: i < 3 ? 'University name abbreviation mismatch' : null,
      officerId: 'demo-officer-1',
      wasOverridden: i < 3,
    })),
    // Marksheet: VERY LOW override rate (~5%)
    ...Array.from({ length: 10 }, (_, i) => ({
      applicationDocumentId: `demo-doc-marks-${i}`,
      documentType: 'Marksheet',
      originalAiStatus: 'VERIFIED',
      originalConfidenceScore: 85 + Math.random() * 10,
      originalMatchResult: JSON.stringify({ marks: { match: true, similarityScore: 1.0 } }),
      officerFinalStatus: 'VERIFIED',
      overrideReason: null,
      officerId: 'demo-officer-1',
      wasOverridden: false, // 0/10 = 0%
    })),
  ];

  await prisma.aIFeedbackLog.createMany({ data: feedbackData });
  console.log(`Seeded ${feedbackData.length} AIFeedbackLog entries.`);
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

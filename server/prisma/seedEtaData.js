const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function main() {
  const schemes = await prisma.scheme.findMany();
  if (schemes.length === 0) {
    console.log('No schemes found. Run scheme seeds first.');
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.log('No admin found.');
    return;
  }

  console.log('Generating 120 synthetic completed applications for ETA training...');

  const finalStatuses = ['SELECTED', 'REJECTED', 'WAITLISTED'];
  const stageFlow = [
    { from: 'DRAFT', to: 'SUBMITTED' },
    { from: 'SUBMITTED', to: 'UNDER_VERIFICATION' },
    { from: 'UNDER_VERIFICATION', to: 'UNDER_SCRUTINY' },
    { from: 'UNDER_SCRUTINY', to: 'READY_FOR_SELECTION' },
  ];

  let created = 0;

  for (let i = 0; i < 120; i++) {
    const scheme = schemes[i % schemes.length];
    const daysAgo = Math.floor(randomBetween(30, 180));
    const submittedAt = randomDate(daysAgo);

    // Simulate complexity factors
    const deficiencyCount = Math.random() > 0.7 ? Math.floor(randomBetween(1, 4)) : 0;
    const flaggedDocCount = Math.random() > 0.6 ? Math.floor(randomBetween(1, 3)) : 0;

    // More deficiencies/flags = longer processing
    const baseDuration = randomBetween(8, 20);
    const deficiencyDelay = deficiencyCount * randomBetween(2, 5);
    const flagDelay = flaggedDocCount * randomBetween(1, 3);
    const totalDuration = baseDuration + deficiencyDelay + flagDelay;

    const finalStatus = finalStatuses[Math.floor(Math.random() * finalStatuses.length)];

    try {
      // Create the application
      const app = await prisma.application.create({
        data: {
          applicantId: admin.id, // Use admin as placeholder applicant
          schemeId: scheme.id,
          status: finalStatus,
          submittedAt,
          predictedDaysRemaining: 0,
          predictionMethod: null,
        },
      });

      // Create status history entries with realistic timestamps
      let currentDate = new Date(submittedAt);

      for (const { from, to } of stageFlow) {
        const stageDuration = randomBetween(1, totalDuration / 4);
        currentDate = new Date(currentDate.getTime() + stageDuration * 24 * 60 * 60 * 1000);

        await prisma.applicationStatusHistory.create({
          data: {
            applicationId: app.id,
            previousStatus: from,
            newStatus: to,
            changedById: admin.id,
            remarks: 'Synthetic seed data',
            changedAt: currentDate,
          },
        });
      }

      // Final status transition
      currentDate = new Date(currentDate.getTime() + randomBetween(1, 5) * 24 * 60 * 60 * 1000);
      await prisma.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          previousStatus: 'READY_FOR_SELECTION',
          newStatus: finalStatus,
          changedById: admin.id,
          remarks: 'Synthetic seed data - final decision',
          changedAt: currentDate,
        },
      });

      // Create synthetic flagged documents
      for (let f = 0; f < flaggedDocCount; f++) {
        // Just mark the count in deficiencies for ML features
      }

      // Create synthetic deficiencies
      for (let d = 0; d < deficiencyCount; d++) {
        await prisma.deficiencyRequest.create({
          data: {
            applicationId: app.id,
            reason: `Synthetic deficiency ${d + 1}`,
            status: 'RESOLVED',
            raisedById: admin.id,
            resolvedAt: new Date(),
          },
        });
      }

      created++;
    } catch (err) {
      console.error(`Error creating app ${i}:`, err.message);
    }
  }

  console.log(`Created ${created} synthetic applications with status histories.`);
  console.log('Now run: POST /api/admin/recalculate-benchmarks to train the model.');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

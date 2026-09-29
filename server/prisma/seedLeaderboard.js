const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getCurrentPeriodLabel } = require('../services/leaderboardService');

async function seedLeaderboard() {
  console.log('Seeding mock leaderboard data...');

  // Get existing officers
  let officers = await prisma.user.findMany({
    where: { role: 'OFFICER' },
    select: { id: true },
  });

  // If there are fewer than 5 officers, create some dummy officers for the demo leaderboard
  if (officers.length < 5) {
    console.log(`Only found ${officers.length} officers. Creating demo officers to fill the leaderboard...`);
    const names = ['Priya Sharma', 'Rahul Verma', 'Anita Desai', 'Vikram Singh', 'Meera Reddy'];
    
    for (let i = officers.length; i < 5; i++) {
      const newOfficer = await prisma.user.create({
        data: {
          name: names[i],
          email: `officer.demo${i}@shikshasaarthi.gov.in`,
          password: 'hashed_password_placeholder',
          role: 'OFFICER',
          isActive: true,
        },
      });
      officers.push({ id: newOfficer.id });
    }
  }

  const periods = ['WEEKLY', 'MONTHLY', 'ALL_TIME'];
  
  for (const officer of officers) {
    for (const period of periods) {
      const periodLabel = getCurrentPeriodLabel(period);
      
      // Generate some realistic-looking random data
      const applicationsCompleted = Math.floor(Math.random() * 50) + 10;
      const avgProcessingHours = parseFloat((Math.random() * 10 + 2).toFixed(2)); // 2 to 12 hours
      const accuracyRate = parseFloat((Math.random() * 20 + 80).toFixed(1)); // 80% to 100%
      const overrideCount = Math.floor(Math.random() * 20);
      const deficienciesRaised = Math.floor(Math.random() * 15);

      await prisma.officerLeaderboardSeed.upsert({
        where: {
          officerId_period_periodLabel: {
            officerId: officer.id,
            period,
            periodLabel,
          },
        },
        update: {
          applicationsCompleted,
          avgProcessingHours,
          accuracyRate,
          overrideCount,
          deficienciesRaised,
        },
        create: {
          officerId: officer.id,
          period,
          periodLabel,
          applicationsCompleted,
          avgProcessingHours,
          accuracyRate,
          overrideCount,
          deficienciesRaised,
          isMockData: true,
        },
      });
    }
  }

  console.log('Leaderboard mock data seeded successfully!');
}

seedLeaderboard()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

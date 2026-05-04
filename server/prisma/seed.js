import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (pw) => bcrypt.hash(pw, 12);

  // Faculty
  const faculty = await prisma.faculty.upsert({
    where: { code: 'CSIT' },
    update: {},
    create: { name: 'מדעי המחשב וטכנולוגיית מידע', code: 'CSIT' },
  });

  // Users
  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@hit.ac.il' },
    update: {},
    create: {
      email: 'coordinator@hit.ac.il',
      passwordHash: await hash('Password1!'),
      firstName: 'רכז',
      lastName: 'פרויקטים',
      role: 'PROJECT_COORDINATOR',
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@hit.ac.il' },
    update: {},
    create: {
      email: 'supervisor@hit.ac.il',
      passwordHash: await hash('Password1!'),
      firstName: 'יוסי',
      lastName: 'כהן',
      role: 'SUPERVISOR',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@hit.ac.il' },
    update: {},
    create: {
      email: 'student@hit.ac.il',
      passwordHash: await hash('Password1!'),
      firstName: 'מיכל',
      lastName: 'לוי',
      role: 'STUDENT',
      studentLevel: 'BSC_3',
    },
  });

  const examiner = await prisma.user.upsert({
    where: { email: 'examiner@hit.ac.il' },
    update: {},
    create: {
      email: 'examiner@hit.ac.il',
      passwordHash: await hash('Password1!'),
      firstName: 'דן',
      lastName: 'ישראלי',
      role: 'EXAMINER',
    },
  });

  // Set coordinator on faculty
  await prisma.faculty.update({
    where: { id: faculty.id },
    data: { coordinatorId: coordinator.id },
  });

  // Faculty memberships
  for (const userId of [coordinator.id, supervisor.id, examiner.id]) {
    await prisma.facultyMember.upsert({
      where: { userId_facultyId: { userId, facultyId: faculty.id } },
      update: {},
      create: { userId, facultyId: faculty.id },
    });
  }

  // Milestone configs
  const milestones = [
    { name: 'הצעת מחקר', order: 1, deadlineOffsetDays: 30, requiresExaminers: false },
    { name: 'דוח התקדמות', order: 2, deadlineOffsetDays: 150, requiresExaminers: false },
    { name: 'דוח מסכם', order: 3, deadlineOffsetDays: 270, requiresExaminers: true },
    { name: 'בחינת הגנה', order: 4, deadlineOffsetDays: 300, requiresExaminers: true },
  ];

  const createdConfigs = [];
  for (const m of milestones) {
    const config = await prisma.milestoneConfig.upsert({
      where: { facultyId_order: { facultyId: faculty.id, order: m.order } },
      update: {},
      create: { ...m, facultyId: faculty.id },
    });
    createdConfigs.push(config);
  }

  // Milestone weights (equal distribution)
  const weight = 0.25;
  for (const config of createdConfigs) {
    await prisma.milestoneWeight.upsert({
      where: { facultyId_configId: { facultyId: faculty.id, configId: config.id } },
      update: {},
      create: { facultyId: faculty.id, configId: config.id, weight },
    });
  }

  console.log('✅ Seed complete');
  console.log('  coordinator@hit.ac.il  / Password1!');
  console.log('  supervisor@hit.ac.il   / Password1!');
  console.log('  student@hit.ac.il      / Password1!');
  console.log('  examiner@hit.ac.il     / Password1!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

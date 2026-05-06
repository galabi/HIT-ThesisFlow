import prisma from '../../lib/prisma.js';
import { calculateFinalGrade } from '@hit/shared';

export async function recalculateFinalGrade(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: { include: { gradeSubmissions: true } },
      faculty: { include: { milestoneWeights: true } },
    },
  });
  if (!project) return null;

  const milestoneGrades = project.milestones.map((m) => {
    const subs = m.gradeSubmissions;
    if (subs.length === 0) return { configId: m.configId, grade: null };
    const avg = subs.reduce((s, g) => s + g.totalScore, 0) / subs.length;
    return { configId: m.configId, grade: avg };
  });

  const milestoneWeights = project.faculty.milestoneWeights.map((w) => ({
    configId: w.configId,
    weight: w.weight,
  }));

  const finalGrade = calculateFinalGrade(milestoneWeights, milestoneGrades);
  if (finalGrade !== null) {
    await prisma.project.update({ where: { id: projectId }, data: { finalGrade } });
  }
  return finalGrade;
}

/**
 * Calculates the weighted final grade for a project.
 *
 * Normalizes by the sum of weights of *completed* milestones only,
 * so partial-completion yields a meaningful intermediate grade.
 *
 * @param {Array<{configId: string, weight: number}>} milestoneWeights
 * @param {Array<{configId: string, grade: number|null}>} milestoneGrades
 * @returns {number|null} grade 0–100, or null if no completed milestones
 */
export function calculateFinalGrade(milestoneWeights, milestoneGrades) {
  const weightMap = new Map(milestoneWeights.map((w) => [w.configId, w.weight]));

  const completed = milestoneGrades.filter((m) => m.grade !== null && m.grade !== undefined);
  if (completed.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { configId, grade } of completed) {
    const weight = weightMap.get(configId);
    if (weight === undefined) continue;
    weightedSum += weight * grade;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Calculates the total score for a single grade form submission.
 *
 * @param {Array<{fieldId: string, weight: number, maxScore: number}>} fields
 * @param {Array<{fieldId: string, numericValue: number|null}>} responses
 * @returns {number} score 0–100
 */
export function calculateSubmissionScore(fields, responses) {
  const responseMap = new Map(responses.map((r) => [r.fieldId, r.numericValue ?? 0]));

  let weightedSum = 0;
  let totalWeight = 0;

  for (const field of fields) {
    if (field.maxScore === 0) continue;
    const raw = responseMap.get(field.fieldId) ?? 0;
    const normalized = (raw / field.maxScore) * 100;
    weightedSum += field.weight * normalized;
    totalWeight += field.weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

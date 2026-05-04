import { z } from 'zod';
import { Role, StudentLevel } from '../enums/roles.js';
import { GradeFieldType, DocumentType } from '../enums/statuses.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(Object.values(Role)),
  studentLevel: z.enum(Object.values(StudentLevel)).optional(),
});

export const proposalSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  requirements: z.string().optional(),
  maxStudents: z.number().int().min(1).max(5).default(1),
  facultyId: z.string().cuid(),
  tags: z.array(z.string()).optional(),
});

export const applicationSchema = z.object({
  proposalId: z.string().cuid(),
  coverLetter: z.string().optional(),
});

export const gradeFieldSchema = z.object({
  label: z.string().min(1),
  fieldType: z.enum(Object.values(GradeFieldType)),
  maxScore: z.number().min(0),
  minScore: z.number().min(0).default(0),
  weight: z.number().min(0).max(1),
  order: z.number().int().min(0),
  isRequired: z.boolean().default(true),
  helpText: z.string().optional(),
  rubricItems: z
    .array(
      z.object({
        label: z.string(),
        score: z.number(),
      })
    )
    .optional(),
});

export const gradeFormTemplateSchema = z.object({
  fields: z.array(gradeFieldSchema).min(1),
});

export const milestoneWeightsSchema = z
  .array(
    z.object({
      configId: z.string().cuid(),
      weight: z.number().min(0).max(1),
    })
  )
  .refine(
    (weights) => {
      const total = weights.reduce((sum, w) => sum + w.weight, 0);
      return Math.abs(total - 1) < 0.001;
    },
    { message: 'Weights must sum to 1.0' }
  );

export const presignSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  documentType: z.enum(Object.values(DocumentType)),
  applicationId: z.string().cuid().optional(),
  milestoneId: z.string().cuid().optional(),
});

export const defenseSchema = z.object({
  milestoneId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
});

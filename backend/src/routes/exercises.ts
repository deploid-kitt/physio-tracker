import { Router } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Role, ExerciseType } from '@prisma/client';

const router = Router();

const exerciseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['REPETITION', 'HOLD', 'TIMED']).default('REPETITION'),
  muscleGroups: z.array(z.string()).default([]),
  difficulty: z.number().min(1).max(5).default(1),
  checkpoints: z.array(z.object({
    name: z.string(),
    conditions: z.record(z.string()),
  })),
  formChecks: z.array(z.object({
    name: z.string(),
    rule: z.string(),
    weight: z.number(),
    feedback: z.string().optional(),
  })),
  defaultConfig: z.record(z.any()).default({}),
  instructions: z.array(z.string()).default([]),
  cues: z.array(z.string()).default([]),
  demoAnimation: z.any().optional(),
  thumbnailUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false),
});

// Get all exercises
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { type, search, muscleGroup } = req.query;

    const where: any = {
      OR: [
        { isPublic: true },
        { isBuiltIn: true },
        { createdById: req.user!.userId },
      ],
    };

    if (type) {
      where.type = type as ExerciseType;
    }

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (muscleGroup) {
      where.muscleGroups = { has: muscleGroup as string };
    }

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        muscleGroups: true,
        difficulty: true,
        thumbnailUrl: true,
        isBuiltIn: true,
        isPublic: true,
        createdById: true,
      },
    });

    res.json({
      success: true,
      data: exercises,
    });
  } catch (error) {
    next(error);
  }
});

// Get exercise by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!exercise) {
      throw new AppError('Exercise not found', 404);
    }

    // Check access
    if (!exercise.isPublic && !exercise.isBuiltIn && exercise.createdById !== req.user!.userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    next(error);
  }
});

// Create exercise
router.post('/', authenticate, requireRole(Role.PHYSIO, Role.ADMIN), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = exerciseSchema.parse(req.body);

    const exercise = await prisma.exercise.create({
      data: {
        ...data,
        createdById: req.user!.userId,
      },
    });

    res.status(201).json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    next(error);
  }
});

// Update exercise
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await prisma.exercise.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Exercise not found', 404);
    }

    if (existing.isBuiltIn) {
      throw new AppError('Cannot modify built-in exercises', 403);
    }

    if (existing.createdById !== req.user!.userId && req.user!.role !== Role.ADMIN) {
      throw new AppError('Access denied', 403);
    }

    const data = exerciseSchema.partial().parse(req.body);

    const exercise = await prisma.exercise.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    next(error);
  }
});

// Delete exercise
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await prisma.exercise.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Exercise not found', 404);
    }

    if (existing.isBuiltIn) {
      throw new AppError('Cannot delete built-in exercises', 403);
    }

    if (existing.createdById !== req.user!.userId && req.user!.role !== Role.ADMIN) {
      throw new AppError('Access denied', 403);
    }

    await prisma.exercise.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Exercise deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

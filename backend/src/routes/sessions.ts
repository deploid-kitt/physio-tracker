import { Router } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma';
import { authenticate, requirePhysioOrOwner } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { SessionStatus } from '@prisma/client';

const router = Router();

const createSessionSchema = z.object({
  exerciseId: z.string(),
  repsTarget: z.number().optional(),
  cameraAngle: z.string().optional(),
});

const updateSessionSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  repsCompleted: z.number().optional(),
  holdDuration: z.number().optional(),
  averageFormScore: z.number().optional(),
  formScores: z.record(z.number()).optional(),
  keypointData: z.any().optional(),
  notes: z.string().optional(),
});

const completeSessionSchema = z.object({
  repsCompleted: z.number(),
  duration: z.number(),
  averageFormScore: z.number().optional(),
  formScores: z.record(z.number()).optional(),
  keypointData: z.any().optional(),
  notes: z.string().optional(),
});

// Get my sessions
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { exerciseId, status, from, to, limit = 20, offset = 0 } = req.query;

    const where: any = {
      userId: req.user!.userId,
    };

    if (exerciseId) {
      where.exerciseId = exerciseId as string;
    }

    if (status) {
      where.status = status as SessionStatus;
    }

    if (from || to) {
      where.startedAt = {};
      if (from) where.startedAt.gte = new Date(from as string);
      if (to) where.startedAt.lte = new Date(to as string);
    }

    const [sessions, total] = await Promise.all([
      prisma.exerciseSession.findMany({
        where,
        include: {
          exercise: {
            select: { name: true, type: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.exerciseSession.count({ where }),
    ]);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get sessions for a patient (for physios)
router.get('/patient/:patientId', authenticate, requirePhysioOrOwner, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { exerciseId, from, to, limit = 20, offset = 0 } = req.query;

    const where: any = {
      userId: req.params.patientId,
      status: SessionStatus.COMPLETED,
    };

    if (exerciseId) {
      where.exerciseId = exerciseId as string;
    }

    if (from || to) {
      where.startedAt = {};
      if (from) where.startedAt.gte = new Date(from as string);
      if (to) where.startedAt.lte = new Date(to as string);
    }

    const [sessions, total] = await Promise.all([
      prisma.exerciseSession.findMany({
        where,
        include: {
          exercise: {
            select: { name: true, type: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.exerciseSession.count({ where }),
    ]);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get session by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const session = await prisma.exerciseSession.findUnique({
      where: { id: req.params.id },
      include: {
        exercise: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Check access - user can see their own sessions, physios can see their patients'
    if (session.userId !== req.user!.userId) {
      // TODO: Verify physio-patient relationship
      if (req.user!.role === 'PATIENT') {
        throw new AppError('Access denied', 403);
      }
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

// Start a new session
router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = createSessionSchema.parse(req.body);

    // Verify exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: data.exerciseId },
    });

    if (!exercise) {
      throw new AppError('Exercise not found', 404);
    }

    const session = await prisma.exerciseSession.create({
      data: {
        userId: req.user!.userId,
        exerciseId: data.exerciseId,
        repsTarget: data.repsTarget,
        cameraAngle: data.cameraAngle,
        status: SessionStatus.IN_PROGRESS,
      },
      include: {
        exercise: true,
      },
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

// Update session (during exercise)
router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await prisma.exerciseSession.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Session not found', 404);
    }

    if (existing.userId !== req.user!.userId) {
      throw new AppError('Access denied', 403);
    }

    const data = updateSessionSchema.parse(req.body);

    const session = await prisma.exerciseSession.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

// Complete session
router.post('/:id/complete', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await prisma.exerciseSession.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Session not found', 404);
    }

    if (existing.userId !== req.user!.userId) {
      throw new AppError('Access denied', 403);
    }

    if (existing.status !== SessionStatus.IN_PROGRESS) {
      throw new AppError('Session is not in progress', 400);
    }

    const data = completeSessionSchema.parse(req.body);

    const session = await prisma.exerciseSession.update({
      where: { id: req.params.id },
      data: {
        ...data,
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        exercise: true,
      },
    });

    // Update progress snapshot
    await updateProgressSnapshot(existing.userId, session);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

// Cancel session
router.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await prisma.exerciseSession.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Session not found', 404);
    }

    if (existing.userId !== req.user!.userId) {
      throw new AppError('Access denied', 403);
    }

    const session = await prisma.exerciseSession.update({
      where: { id: req.params.id },
      data: {
        status: SessionStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to update progress snapshot
async function updateProgressSnapshot(userId: string, session: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.progressSnapshot.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  const exerciseBreakdown = existing?.exerciseBreakdown as Record<string, any> || {};
  const exerciseName = session.exercise?.name || session.exerciseId;

  if (!exerciseBreakdown[exerciseName]) {
    exerciseBreakdown[exerciseName] = { reps: 0, avgForm: 0, count: 0 };
  }

  exerciseBreakdown[exerciseName].reps += session.repsCompleted;
  exerciseBreakdown[exerciseName].count += 1;
  if (session.averageFormScore) {
    const prev = exerciseBreakdown[exerciseName].avgForm;
    const count = exerciseBreakdown[exerciseName].count;
    exerciseBreakdown[exerciseName].avgForm = 
      (prev * (count - 1) + session.averageFormScore) / count;
  }

  if (existing) {
    await prisma.progressSnapshot.update({
      where: { id: existing.id },
      data: {
        totalSessions: existing.totalSessions + 1,
        totalReps: existing.totalReps + session.repsCompleted,
        totalDuration: existing.totalDuration + (session.duration || 0),
        averageFormScore: session.averageFormScore 
          ? (existing.averageFormScore 
              ? (existing.averageFormScore * existing.totalSessions + session.averageFormScore) / (existing.totalSessions + 1)
              : session.averageFormScore)
          : existing.averageFormScore,
        exerciseBreakdown,
      },
    });
  } else {
    await prisma.progressSnapshot.create({
      data: {
        userId,
        date: today,
        totalSessions: 1,
        totalReps: session.repsCompleted,
        totalDuration: session.duration || 0,
        averageFormScore: session.averageFormScore,
        exerciseBreakdown,
      },
    });
  }
}

export default router;

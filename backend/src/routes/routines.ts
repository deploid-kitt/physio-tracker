import { Router } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

const router = Router();

const routineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration: z.number().optional(),
  isPublic: z.boolean().default(false),
  exercises: z.array(z.object({
    exerciseId: z.string().uuid(),
    order: z.number().default(0),
    sets: z.number().default(3),
    reps: z.number().optional(),
    holdSeconds: z.number().optional(),
    restSeconds: z.number().default(60),
    notes: z.string().optional(),
  })).default([]),
});

const assignmentSchema = z.object({
  patientId: z.string().uuid(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Get routines
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const routines = await prisma.routine.findMany({
      where: {
        OR: [
          { isPublic: true },
          { createdById: req.user!.userId },
        ],
      },
      include: {
        exercises: {
          include: {
            exercise: {
              select: { name: true, type: true, thumbnailUrl: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: routines,
    });
  } catch (error) {
    next(error);
  }
});

// Get my assigned routines (for patients)
router.get('/assigned', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const assignments = await prisma.routineAssignment.findMany({
      where: {
        patientId: req.user!.userId,
        isActive: true,
      },
      include: {
        routine: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        assignedBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
});

// Get routine by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const routine = await prisma.routine.findUnique({
      where: { id: req.params.id },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        assignments: {
          where: { isActive: true },
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!routine) {
      throw new AppError('Routine not found', 404);
    }

    // Check access
    if (!routine.isPublic && routine.createdById !== req.user!.userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: routine,
    });
  } catch (error) {
    next(error);
  }
});

// Create routine
router.post('/', authenticate, requireRole(Role.PHYSIO, Role.ADMIN), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { exercises, ...data } = routineSchema.parse(req.body);

    const routine = await prisma.routine.create({
      data: {
        ...data,
        createdById: req.user!.userId,
        exercises: {
          create: exercises,
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: routine,
    });
  } catch (error) {
    next(error);
  }
});

// Update routine
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await prisma.routine.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Routine not found', 404);
    }

    if (existing.createdById !== req.user!.userId && req.user!.role !== Role.ADMIN) {
      throw new AppError('Access denied', 403);
    }

    const { exercises, ...data } = routineSchema.partial().parse(req.body);

    // Update routine
    const routine = await prisma.routine.update({
      where: { id: req.params.id },
      data,
    });

    // Update exercises if provided
    if (exercises) {
      // Remove existing exercises
      await prisma.routineExercise.deleteMany({
        where: { routineId: req.params.id },
      });

      // Add new exercises
      await prisma.routineExercise.createMany({
        data: exercises.map(e => ({
          ...e,
          routineId: req.params.id,
        })),
      });
    }

    const updated = await prisma.routine.findUnique({
      where: { id: req.params.id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// Delete routine
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await prisma.routine.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Routine not found', 404);
    }

    if (existing.createdById !== req.user!.userId && req.user!.role !== Role.ADMIN) {
      throw new AppError('Access denied', 403);
    }

    await prisma.routine.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Routine deleted',
    });
  } catch (error) {
    next(error);
  }
});

// Assign routine to patient
router.post('/:id/assign', authenticate, requireRole(Role.PHYSIO, Role.ADMIN), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = assignmentSchema.parse(req.body);

    // Verify physio-patient relationship
    const relationship = await prisma.physioPatient.findUnique({
      where: {
        physioId_patientId: {
          physioId: req.user!.userId,
          patientId: data.patientId,
        },
      },
    });

    if (!relationship || !relationship.isActive) {
      throw new AppError('Patient not assigned to you', 403);
    }

    // Check for existing assignment
    const existing = await prisma.routineAssignment.findFirst({
      where: {
        routineId: req.params.id,
        patientId: data.patientId,
        isActive: true,
      },
    });

    if (existing) {
      throw new AppError('Routine already assigned to this patient', 409);
    }

    const assignment = await prisma.routineAssignment.create({
      data: {
        routineId: req.params.id,
        patientId: data.patientId,
        assignedById: req.user!.userId,
        frequency: data.frequency,
        notes: data.notes,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        routine: true,
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
});

// Unassign routine
router.delete('/:id/assign/:patientId', authenticate, requireRole(Role.PHYSIO, Role.ADMIN), async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.routineAssignment.updateMany({
      where: {
        routineId: req.params.id,
        patientId: req.params.patientId,
        assignedById: req.user!.userId,
      },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Routine unassigned',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

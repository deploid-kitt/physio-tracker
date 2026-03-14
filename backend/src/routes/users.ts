import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../services/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

const router = Router();

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

const updateCalibrationSchema = z.object({
  standingKneeAngle: z.number().min(150).max(180).optional(),
  mobilityLimit: z.number().min(60).max(120).optional(),
  asymmetryBaseline: z.number().min(0).max(20).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

// Update profile
router.patch('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// Update calibration data
router.patch('/me/calibration', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = updateCalibrationSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    const calibrationData = {
      ...(existingUser?.calibrationData as object || {}),
      ...data,
      lastCalibrated: new Date().toISOString(),
    };

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { calibrationData },
      select: {
        id: true,
        calibrationData: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/me/change-password', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user!.userId },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get patients (for physios)
router.get('/patients', authenticate, requireRole(Role.PHYSIO, Role.ADMIN), async (req: AuthenticatedRequest, res, next) => {
  try {
    const patients = await prisma.physioPatient.findMany({
      where: {
        physioId: req.user!.userId,
        isActive: true,
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: patients.map(p => ({
        ...p.patient,
        notes: p.notes,
        assignedAt: p.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Add patient (for physios)
router.post('/patients', authenticate, requireRole(Role.PHYSIO, Role.ADMIN), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { email, notes } = req.body;

    const patient = await prisma.user.findUnique({
      where: { email },
    });

    if (!patient) {
      throw new AppError('Patient not found with this email', 404);
    }

    if (patient.role !== Role.PATIENT) {
      throw new AppError('User is not a patient', 400);
    }

    const existing = await prisma.physioPatient.findUnique({
      where: {
        physioId_patientId: {
          physioId: req.user!.userId,
          patientId: patient.id,
        },
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new AppError('Patient already assigned to you', 409);
      }
      // Reactivate
      await prisma.physioPatient.update({
        where: { id: existing.id },
        data: { isActive: true, notes },
      });
    } else {
      await prisma.physioPatient.create({
        data: {
          physioId: req.user!.userId,
          patientId: patient.id,
          notes,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: patient.id,
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Remove patient
router.delete('/patients/:patientId', authenticate, requireRole(Role.PHYSIO, Role.ADMIN), async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.physioPatient.updateMany({
      where: {
        physioId: req.user!.userId,
        patientId: req.params.patientId,
      },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Patient removed',
    });
  } catch (error) {
    next(error);
  }
});

// Get patient details (for physios)
router.get('/patients/:patientId', authenticate, requireRole(Role.PHYSIO, Role.ADMIN), async (req: AuthenticatedRequest, res, next) => {
  try {
    const relationship = await prisma.physioPatient.findUnique({
      where: {
        physioId_patientId: {
          physioId: req.user!.userId,
          patientId: req.params.patientId,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            calibrationData: true,
            createdAt: true,
          },
        },
      },
    });

    if (!relationship || !relationship.isActive) {
      throw new AppError('Patient not found or not assigned to you', 404);
    }

    // Get recent sessions
    const recentSessions = await prisma.exerciseSession.findMany({
      where: { userId: req.params.patientId },
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: {
        exercise: {
          select: { name: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        ...relationship.patient,
        notes: relationship.notes,
        recentSessions,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import prisma from '../services/prisma';
import { authenticate, requirePhysioOrOwner } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Get my progress
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { from, to, days = 30 } = req.query;

    let startDate: Date;
    let endDate: Date = new Date();

    if (from && to) {
      startDate = new Date(from as string);
      endDate = new Date(to as string);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
    }

    const snapshots = await prisma.progressSnapshot.findMany({
      where: {
        userId: req.user!.userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totals = snapshots.reduce(
      (acc, s) => ({
        totalSessions: acc.totalSessions + s.totalSessions,
        totalReps: acc.totalReps + s.totalReps,
        totalDuration: acc.totalDuration + s.totalDuration,
        avgFormScore: acc.avgFormScore + (s.averageFormScore || 0),
      }),
      { totalSessions: 0, totalReps: 0, totalDuration: 0, avgFormScore: 0 }
    );

    if (snapshots.length > 0) {
      totals.avgFormScore /= snapshots.filter(s => s.averageFormScore).length || 1;
    }

    res.json({
      success: true,
      data: {
        snapshots,
        totals,
        period: {
          from: startDate,
          to: endDate,
          days: Number(days),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get progress for a specific patient (for physios)
router.get('/patient/:patientId', authenticate, requirePhysioOrOwner, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { from, to, days = 30 } = req.query;

    let startDate: Date;
    let endDate: Date = new Date();

    if (from && to) {
      startDate = new Date(from as string);
      endDate = new Date(to as string);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
    }

    const snapshots = await prisma.progressSnapshot.findMany({
      where: {
        userId: req.params.patientId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get exercise breakdown over time
    const exerciseStats: Record<string, any[]> = {};
    
    snapshots.forEach(snapshot => {
      const breakdown = snapshot.exerciseBreakdown as Record<string, any> || {};
      Object.entries(breakdown).forEach(([exercise, stats]) => {
        if (!exerciseStats[exercise]) {
          exerciseStats[exercise] = [];
        }
        exerciseStats[exercise].push({
          date: snapshot.date,
          ...stats,
        });
      });
    });

    res.json({
      success: true,
      data: {
        snapshots,
        exerciseStats,
        period: {
          from: startDate,
          to: endDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get exercise-specific progress
router.get('/exercise/:exerciseId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const sessions = await prisma.exerciseSession.findMany({
      where: {
        userId: req.user!.userId,
        exerciseId: req.params.exerciseId,
        status: 'COMPLETED',
        startedAt: { gte: startDate },
      },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        startedAt: true,
        repsCompleted: true,
        duration: true,
        averageFormScore: true,
        formScores: true,
      },
    });

    // Calculate trends
    const formScoreTrend = sessions.length >= 2
      ? (sessions[sessions.length - 1].averageFormScore || 0) - (sessions[0].averageFormScore || 0)
      : 0;

    res.json({
      success: true,
      data: {
        sessions,
        summary: {
          totalSessions: sessions.length,
          totalReps: sessions.reduce((sum, s) => sum + s.repsCompleted, 0),
          avgFormScore: sessions.reduce((sum, s) => sum + (s.averageFormScore || 0), 0) / (sessions.length || 1),
          formScoreTrend,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get leaderboard / achievements (gamification)
router.get('/achievements', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    // Get total stats
    const totals = await prisma.exerciseSession.aggregate({
      where: {
        userId: req.user!.userId,
        status: 'COMPLETED',
      },
      _count: true,
      _sum: {
        repsCompleted: true,
        duration: true,
      },
      _avg: {
        averageFormScore: true,
      },
    });

    // Get streak (consecutive days with sessions)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSnapshots = await prisma.progressSnapshot.findMany({
      where: {
        userId: req.user!.userId,
        date: { gte: thirtyDaysAgo },
        totalSessions: { gt: 0 },
      },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const snapshot of recentSnapshots) {
      const snapshotDate = new Date(snapshot.date);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);

      if (snapshotDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    // Define achievements
    const achievements = [];

    if (totals._count >= 1) achievements.push({ id: 'first_session', name: 'First Step', description: 'Complete your first session' });
    if (totals._count >= 10) achievements.push({ id: 'dedicated', name: 'Dedicated', description: 'Complete 10 sessions' });
    if (totals._count >= 50) achievements.push({ id: 'committed', name: 'Committed', description: 'Complete 50 sessions' });
    if (totals._count >= 100) achievements.push({ id: 'centurion', name: 'Centurion', description: 'Complete 100 sessions' });
    
    if ((totals._sum.repsCompleted || 0) >= 100) achievements.push({ id: 'rep_starter', name: 'Rep Starter', description: 'Complete 100 reps' });
    if ((totals._sum.repsCompleted || 0) >= 1000) achievements.push({ id: 'rep_master', name: 'Rep Master', description: 'Complete 1000 reps' });
    
    if (streak >= 3) achievements.push({ id: 'streak_3', name: '3 Day Streak', description: 'Exercise 3 days in a row' });
    if (streak >= 7) achievements.push({ id: 'streak_7', name: 'Week Warrior', description: 'Exercise 7 days in a row' });
    if (streak >= 30) achievements.push({ id: 'streak_30', name: 'Monthly Master', description: 'Exercise 30 days in a row' });
    
    if ((totals._avg.averageFormScore || 0) >= 90) achievements.push({ id: 'form_perfect', name: 'Perfect Form', description: 'Average form score above 90%' });

    res.json({
      success: true,
      data: {
        stats: {
          totalSessions: totals._count,
          totalReps: totals._sum.repsCompleted || 0,
          totalDuration: totals._sum.duration || 0,
          avgFormScore: totals._avg.averageFormScore || 0,
          currentStreak: streak,
        },
        achievements,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

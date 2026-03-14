import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from '../types';
import { AppError } from './errorHandler';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'physio-tracker-secret-key';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

export const requirePhysioOrOwner = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  // Physios can access any patient data they're assigned to
  // Patients can only access their own data
  const targetUserId = req.params.userId || req.params.patientId;

  if (req.user.role === Role.PHYSIO || req.user.role === Role.ADMIN) {
    // TODO: Verify physio-patient relationship
    return next();
  }

  if (req.user.userId === targetUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'You can only access your own data',
  });
};

export const generateTokens = (user: { id: string; email: string; role: Role }) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid token type', 401);
  }
  return { userId: decoded.userId };
};

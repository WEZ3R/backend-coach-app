import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/responseHandler.js';
import prisma from '../config/database.js';

/**
 * Middleware d'authentification
 * Vérifie le token JWT dans le header Authorization
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'No token provided', 401);
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier et décoder le token
    const decoded = verifyToken(token);

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token', 401);
  }
};

/**
 * Middleware de vérification du rôle
 * @param {...string} roles - Rôles autorisés
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden: Insufficient permissions', 403);
    }

    next();
  };
};

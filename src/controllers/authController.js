import prisma from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Inscription d'un nouvel utilisateur
 */
export const register = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, weight, height, dateOfBirth } = req.body;

    // Validation des champs requis
    if (!email || !password || !role || !firstName || !lastName) {
      return sendError(res, 'Tous les champs sont requis (email, mot de passe, rôle, prénom, nom)', 400);
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, "Le format de l'email n'est pas valide", 400);
    }

    // Validation de la longueur du mot de passe
    if (password.length < 6) {
      return sendError(res, 'Le mot de passe doit contenir au moins 6 caractères', 400);
    }

    // Validation du rôle
    if (role !== 'COACH' && role !== 'CLIENT') {
      return sendError(res, 'Le rôle doit être COACH ou CLIENT', 400);
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, 'Cet email est déjà utilisé. Veuillez en choisir un autre ou vous connecter.', 400);
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    // Créer le profil correspondant au rôle
    if (role === 'COACH') {
      await prisma.coachProfile.create({
        data: {
          userId: user.id,
        },
      });
    } else if (role === 'CLIENT') {
      // Créer le profil client avec les informations optionnelles
      await prisma.clientProfile.create({
        data: {
          userId: user.id,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        },
      });
    }

    // Générer un token
    const token = generateToken({ userId: user.id, role: user.role });

    sendSuccess(
      res,
      {
        user,
        token,
      },
      'Inscription réussie',
      201
    );
  } catch (error) {
    console.error('Register error:', error);

    // Messages d'erreur détaillés selon le type d'erreur
    if (error.code === 'P2002') {
      return sendError(res, 'Cet email est déjà utilisé', 400);
    }

    if (error.code === 'P2003') {
      return sendError(res, 'Erreur de relation dans la base de données', 400);
    }

    sendError(res, `Erreur lors de l'inscription: ${error.message}`, 500);
  }
};

/**
 * Connexion d'un utilisateur
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return sendError(res, 'Email ou mot de passe incorrect', 401);
    }

    // Vérifier le mot de passe
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return sendError(res, 'Email ou mot de passe incorrect', 401);
    }

    // Générer un token
    const token = generateToken({ userId: user.id, role: user.role });

    // Retourner les données sans le mot de passe
    const { password: _, ...userWithoutPassword } = user;

    sendSuccess(res, {
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Login failed', 500);
  }
};

/**
 * Récupérer le profil de l'utilisateur connecté
 */
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        coachProfile: true,
        clientProfile: {
          include: {
            coach: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    sendSuccess(res, user);
  } catch (error) {
    console.error('Get me error:', error);
    sendError(res, 'Failed to get user profile', 500);
  }
};

/**
 * Mettre à jour le profil de l'utilisateur connecté
 */
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, birthDate } = req.body;
    const userId = req.user.id;

    // Validation des champs requis
    if (!firstName || !lastName || !email) {
      return sendError(res, 'Le prénom, le nom et l\'email sont requis', 400);
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, "Le format de l'email n'est pas valide", 400);
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        return sendError(res, 'Cet email est déjà utilisé par un autre utilisateur', 400);
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        birthDate: true,
      },
    });

    sendSuccess(res, updatedUser, 'Profil mis à jour avec succès');
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.code === 'P2002') {
      return sendError(res, 'Cet email est déjà utilisé', 400);
    }

    sendError(res, `Erreur lors de la mise à jour du profil: ${error.message}`, 500);
  }
};

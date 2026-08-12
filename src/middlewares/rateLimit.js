/**
 * Limitation de débit.
 *
 * Sans elle, /api/auth/login accepte un nombre illimité de tentatives : rien
 * n'empêche de tester des mots de passe en masse.
 *
 * Deux limiteurs, car les besoins diffèrent : l'authentification doit être stricte,
 * le reste de l'API seulement protégé des abus grossiers.
 *
 * Neutralisés quand NODE_ENV=test : la suite d'intégration crée des dizaines de
 * comptes en quelques secondes et serait bloquée par le limiteur, ce qui masquerait
 * de vraies régressions derrière des 429.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const disabled = config.nodeEnv === 'test';

/** Renvoie un middleware neutre en test, le limiteur réel sinon. */
const build = (options) =>
  disabled ? (req, res, next) => next() : rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...options,
  });

/**
 * Authentification : 10 tentatives par IP et par quart d'heure.
 * `skipSuccessfulRequests` fait que seules les tentatives ratées comptent — une
 * personne qui se connecte normalement n'est jamais gênée.
 */
export const authLimiter = build({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
    errors: null,
  },
});

/** Reste de l'API : 300 requêtes par IP et par minute. */
export const apiLimiter = build({
  windowMs: 60 * 1000,
  limit: 300,
  message: {
    success: false,
    message: 'Trop de requêtes. Ralentissez un instant.',
    errors: null,
  },
});

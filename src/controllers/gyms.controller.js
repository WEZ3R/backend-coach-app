import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { geocodeCity, searchGymsOverpass } from '../services/overpass.js';

/**
 * Rechercher des salles de sport par ville (ou coordonnées)
 * GET /api/gyms/search?city=Paris&lat=48.8&lng=2.3&radius=5000
 */
export const searchGyms = async (req, res) => {
  try {
    let { city, lat, lng, radius = 5000 } = req.query;

    radius = parseInt(radius, 10);
    if (isNaN(radius) || radius < 500 || radius > 50000) radius = 5000;

    let parsedLat = lat ? parseFloat(lat) : null;
    let parsedLng = lng ? parseFloat(lng) : null;
    let resolvedCity = city || null;

    // Géocoder la ville si pas de coordonnées
    if (!parsedLat || !parsedLng) {
      if (!city) return sendError(res, 'city ou lat+lng requis', 400);

      const coords = await geocodeCity(city);
      if (!coords) return sendError(res, `Ville introuvable : ${city}`, 404);

      parsedLat = coords.lat;
      parsedLng = coords.lng;
    }

    // Récupérer depuis Overpass
    const overpassGyms = await searchGymsOverpass(parsedLat, parsedLng, radius);

    // Upsert en base par osmId
    const saved = await Promise.all(
      overpassGyms.map((g) =>
        prisma.gym.upsert({
          where: { osmId: g.osmId },
          update: {
            name: g.name,
            brand: g.brand,
            address: g.address,
            city: g.city || resolvedCity || '',
            postalCode: g.postalCode,
            latitude: g.latitude,
            longitude: g.longitude,
          },
          create: {
            osmId: g.osmId,
            name: g.name,
            brand: g.brand,
            address: g.address,
            city: g.city || resolvedCity || '',
            postalCode: g.postalCode,
            latitude: g.latitude,
            longitude: g.longitude,
          },
        })
      )
    );

    sendSuccess(res, saved, `${saved.length} salle(s) trouvée(s)`);
  } catch (error) {
    console.error('Search gyms error:', error);
    sendError(res, 'Erreur lors de la recherche de salles', 500);
  }
};

/**
 * Rechercher des salles dans la base par nom (texte libre)
 * GET /api/gyms/db-search?q=basic-fit&city=Paris
 */
export const searchGymsInDb = async (req, res) => {
  try {
    const { q, city } = req.query;
    if (!q || q.trim().length < 2) return sendError(res, 'Paramètre q requis (min 2 caractères)', 400);

    const gyms = await prisma.gym.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: q.trim(), mode: 'insensitive' } },
              { brand: { contains: q.trim(), mode: 'insensitive' } },
              { address: { contains: q.trim(), mode: 'insensitive' } },
            ],
          },
          ...(city ? [{ city: { contains: city.trim(), mode: 'insensitive' } }] : []),
        ],
      },
      orderBy: { name: 'asc' },
      take: 30,
    });

    sendSuccess(res, gyms, `${gyms.length} salle(s) trouvée(s)`);
  } catch (error) {
    console.error('DB search gyms error:', error);
    sendError(res, 'Erreur lors de la recherche', 500);
  }
};

/**
 * Récupérer une salle par ID
 * GET /api/gyms/:id
 */
export const getGymById = async (req, res) => {
  try {
    const gym = await prisma.gym.findUnique({ where: { id: req.params.id } });
    if (!gym) return sendError(res, 'Salle introuvable', 404);
    sendSuccess(res, gym);
  } catch (error) {
    console.error('Get gym error:', error);
    sendError(res, 'Erreur serveur', 500);
  }
};

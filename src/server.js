import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import prisma from './config/database.js';

// Import des routes
import authRoutes from './routes/auth.js';
import programRoutes from './routes/programs.js';
import sessionRoutes from './routes/sessions.js';
import mealRoutes from './routes/meals.js';
import statRoutes from './routes/stats.js';
import messageRoutes from './routes/messages.js';
import clientRoutes from './routes/clients.js';
import goalRoutes from './routes/goals.js';
import templateRoutes from './routes/templates.js';
import analyticsRoutes from './routes/analytics.js';
import postsRoutes from './routes/posts.js';
import coachesRoutes from './routes/coaches.js';
import requestRoutes from './routes/requests.js';
import setCompletionRoutes from './routes/setCompletions.js';
import clientCoachRoutes from './routes/clientCoach.js';
import foodRoutes from './routes/food.js';
import exerciseRefRoutes from './routes/exerciseRefs.js';
import appointmentRoutes from './routes/appointments.js';
import availabilityRoutes from './routes/availability.js';
import gymRoutes from './routes/gyms.js';
import notificationRoutes from './routes/notifications.js';
import sessionTemplateRoutes from './routes/sessionTemplates.js';
import nutritionRoutes from './routes/nutrition.js';
import './jobs/appointmentReminders.js';

const app = express();

// Middlewares globaux
app.use(cors({
  origin: config.nodeEnv === 'development' ? '*' : config.cors.origin,
  credentials: config.nodeEnv !== 'development',
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/coaches', coachesRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/set-completions', setCompletionRoutes);
app.use('/api/client-coaches', clientCoachRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/exercise-refs', exerciseRefRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/session-templates', sessionTemplateRoutes);
app.use('/api/nutrition', nutritionRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Démarrage du serveur
const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🏋️  Coaching App API Server        ║
╚═══════════════════════════════════════╝

🚀 Server running on port ${PORT}
🌍 Environment: ${config.nodeEnv}
📡 API URL: http://localhost:${PORT}/api
🔗 Health check: http://localhost:${PORT}/api/health

Press CTRL+C to stop
  `);
});

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
  console.log('\n\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;

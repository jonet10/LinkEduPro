const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const securityHeaders = require('./middlewares/security-headers');
const authRoutes = require('./routes/auth.routes');
const subjectRoutes = require('./routes/subject.routes');
const quizRoutes = require('./routes/quiz.routes');
const resultRoutes = require('./routes/result.routes');
const libraryRoutes = require('./routes/library.routes');
const notificationRoutes = require('./routes/notification.routes');
const schoolManagementRoutes = require('./school-management/routes');
const communityRoutes = require('./community/routes');
const docsRoutes = require('./routes/docs.routes');
const publicRoutes = require('./routes/public.routes');
const messageRoutes = require('./routes/message.routes');
const catchupRoutes = require('./routes/catchup.routes');
const paymentRoutes = require('./routes/payment.routes');
const platformDonationRoutes = require('./routes/platform-donation.routes');
const eduCollectRoutes = require('./routes/educollect.routes');
const v2Routes = require('./v2/routes');
const searchRoutes = require('./search/routes/search.routes');
const realtimeRoutes = require('./routes/realtime.routes');
const { focusRouter, pomodoroRouter } = require('./focus/routes/focus.routes');
const { getStorageRoot } = require('./config/storage');
const { API_BASE_URL } = require('./config/api-base-url');

const app = express();

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    ...(String(process.env.FRONTEND_URLS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean))
  ].filter(Boolean)
);

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Requested-With'],
  maxAge: 86400,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin non autorisee par CORS.'));
  }
};

if (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true') {
  app.set('trust proxy', 1);
}

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: false, limit: process.env.FORM_BODY_LIMIT || '50kb' }));
app.use(morgan('dev'));
app.use(
  '/storage',
  express.static(getStorageRoot(), {
    index: false,
    maxAge: '7d',
    setHeaders(res, filePath) {
      // Frontend and backend run on different origins in production.
      // Allow embedding/reading media (covers + PDF) from frontend.
      res.removeHeader('X-Frame-Options');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (/\.pdf$/i.test(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
    }
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', apiBaseUrl: API_BASE_URL });
});

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/school-management', schoolManagementRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/catchup', catchupRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/platform-donations', platformDonationRoutes);
app.use('/api/educollect', eduCollectRoutes);
app.use('/api/v2', v2Routes);
app.use('/api/search', searchRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/focus', focusRouter);
app.use('/api/pomodoro', pomodoroRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (error && error.message === 'Origin non autorisee par CORS.') {
    return res.status(403).json({ message: 'Origine non autorisee.' });
  }
  const status = Number(error?.status) || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd
    ? 'Erreur serveur interne.'
    : (error?.message || 'Erreur serveur interne.');
  res.status(status).json({ message });
});

module.exports = app;

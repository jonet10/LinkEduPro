const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
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
const v2Routes = require('./v2/routes');
const searchRoutes = require('./search/routes/search.routes');
const { focusRouter, pomodoroRouter } = require('./focus/routes/focus.routes');
const { getStorageRoot } = require('./config/storage');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/storage', express.static(getStorageRoot()));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
app.use('/api/v2', v2Routes);
app.use('/api/search', searchRoutes);
app.use('/api/focus', focusRouter);
app.use('/api/pomodoro', pomodoroRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number(error?.status) || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd
    ? 'Erreur serveur interne.'
    : (error?.message || 'Erreur serveur interne.');
  res.status(status).json({ message });
});

module.exports = app;

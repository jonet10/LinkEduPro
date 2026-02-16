const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const subjectRoutes = require('./routes/subject.routes');
const quizRoutes = require('./routes/quiz.routes');
const resultRoutes = require('./routes/result.routes');
const libraryRoutes = require('./routes/library.routes');
const schoolManagementRoutes = require('./school-management/routes');
const communityRoutes = require('./community/routes');
const docsRoutes = require('./routes/docs.routes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/school-management', schoolManagementRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/docs', docsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Erreur serveur interne.' });
});

module.exports = app;

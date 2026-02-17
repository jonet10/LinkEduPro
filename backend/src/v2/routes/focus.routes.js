const express = require('express');
const validate = require('../../middlewares/validate');
const { requireSuperAdmin } = require('../../middlewares/super-admin');
const {
  createMusicTrack,
  getMusicTracks,
  logPomodoroSession,
  getDailyStats
} = require('../controllers/focus.controller');
const {
  createMusicTrackSchema,
  logPomodoroSessionSchema,
  dailyStatsQuerySchema,
  focusMusicQuerySchema
} = require('../validators/v2.validators');

const router = express.Router();

router.get('/music', validate(focusMusicQuerySchema, 'query'), getMusicTracks);
router.post('/music', requireSuperAdmin, validate(createMusicTrackSchema), createMusicTrack);
router.post('/pomodoro-sessions', validate(logPomodoroSessionSchema), logPomodoroSession);
router.get('/stats/daily', validate(dailyStatsQuerySchema, 'query'), getDailyStats);

module.exports = router;

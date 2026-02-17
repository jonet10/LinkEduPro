const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const {
  listFocusMusic,
  addCustomSong,
  logMusicListen,
  startPomodoro,
  stopPomodoro,
  getFocusStats
} = require('../controllers/focus.controller');
const {
  startPomodoroSchema,
  stopPomodoroSchema,
  listenSongSchema,
  customSongSchema,
  focusStatsQuerySchema
} = require('../validators/focus.validators');

const focusRouter = express.Router();
focusRouter.use(auth);

focusRouter.get('/music', listFocusMusic);
focusRouter.post('/music/custom', validate(customSongSchema), addCustomSong);
focusRouter.post('/music/listen', validate(listenSongSchema), logMusicListen);
focusRouter.get('/stats', validate(focusStatsQuerySchema, 'query'), getFocusStats);

const pomodoroRouter = express.Router();
pomodoroRouter.use(auth);
pomodoroRouter.post('/start', validate(startPomodoroSchema), startPomodoro);
pomodoroRouter.post('/stop', validate(stopPomodoroSchema), stopPomodoro);

module.exports = { focusRouter, pomodoroRouter };

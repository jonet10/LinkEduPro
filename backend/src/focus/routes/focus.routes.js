const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { requireSuperAdmin } = require('../../middlewares/super-admin');
const {
  canManageFocusMusic,
  listFocusMusic,
  addCustomSong,
  updateSong,
  deleteSong,
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
  songIdParamSchema,
  updateSongSchema,
  focusStatsQuerySchema
} = require('../validators/focus.validators');

const focusRouter = express.Router();
focusRouter.use(auth);

focusRouter.get('/music', listFocusMusic);
focusRouter.get('/music/can-manage', canManageFocusMusic);
focusRouter.post('/music/custom', requireSuperAdmin, validate(customSongSchema), addCustomSong);
focusRouter.patch('/music/:songId', requireSuperAdmin, validate(songIdParamSchema, 'params'), validate(updateSongSchema), updateSong);
focusRouter.delete('/music/:songId', requireSuperAdmin, validate(songIdParamSchema, 'params'), deleteSong);
focusRouter.post('/music/listen', validate(listenSongSchema), logMusicListen);
focusRouter.get('/stats', validate(focusStatsQuerySchema, 'query'), getFocusStats);

const pomodoroRouter = express.Router();
pomodoroRouter.use(auth);
pomodoroRouter.post('/start', validate(startPomodoroSchema), startPomodoro);
pomodoroRouter.post('/stop', validate(stopPomodoroSchema), stopPomodoro);

module.exports = { focusRouter, pomodoroRouter };

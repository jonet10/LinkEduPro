const request = require('supertest');
const express = require('express');

const mockPrisma = {
  focusSong: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn()
  },
  focusSongListen: {
    create: jest.fn()
  },
  pomodoroSession: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  focusStatistic: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn()
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma))
};

jest.mock('../../src/config/prisma', () => mockPrisma);
jest.mock('../../src/middlewares/auth', () => (req, _res, next) => {
  req.user = { id: 1, role: 'STUDENT' };
  next();
});

const { focusRouter, pomodoroRouter } = require('../../src/focus/routes/focus.routes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/focus', focusRouter);
  app.use('/pomodoro', pomodoroRouter);
  app.use((error, _req, res, _next) => {
    res.status(500).json({ message: error.message || 'server error' });
  });
  return app;
}

describe('focus module integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.focusSong.findMany.mockResolvedValue([]);
    mockPrisma.focusSong.findUnique.mockResolvedValue(null);
    mockPrisma.focusSong.create.mockResolvedValue({ id: 1, title: 'x', url: 'https://x.test', category: 'custom' });
    mockPrisma.focusSongListen.create.mockResolvedValue({ id: 10, userId: 1, songId: 2 });

    mockPrisma.pomodoroSession.findFirst.mockResolvedValue(null);
    mockPrisma.pomodoroSession.create.mockResolvedValue({
      id: 100,
      userId: 1,
      duration: 25,
      startTime: new Date(),
      cycleType: 'WORK',
      status: 'RUNNING'
    });
    mockPrisma.pomodoroSession.update.mockResolvedValue({
      id: 100,
      duration: 25,
      startTime: new Date(Date.now() - 25 * 60000),
      endTime: new Date(),
      cycleType: 'WORK',
      status: 'COMPLETED'
    });
    mockPrisma.pomodoroSession.findMany.mockResolvedValue([]);

    mockPrisma.focusStatistic.upsert.mockResolvedValue({ id: 1 });
    mockPrisma.focusStatistic.findMany.mockResolvedValue([]);
    mockPrisma.focusStatistic.findUnique.mockResolvedValue(null);
    mockPrisma.focusStatistic.aggregate.mockResolvedValue({ _sum: { totalTime: 0, pomodorosCompleted: 0 } });
  });

  test('POST /focus/music/listen logs track play', async () => {
    mockPrisma.focusSong.findUnique.mockResolvedValue({ id: 2, title: 'Rain', url: 'https://a.test' });

    const app = createApp();
    const res = await request(app).post('/focus/music/listen').send({ songId: 2 });

    expect(res.status).toBe(201);
    expect(mockPrisma.focusSongListen.create).toHaveBeenCalled();
  });

  test('POST /pomodoro/start starts new session', async () => {
    const app = createApp();
    const res = await request(app).post('/pomodoro/start').send({ workDuration: 25, breakDuration: 5, cycleType: 'WORK' });

    expect(res.status).toBe(201);
    expect(res.body.session.status).toBe('RUNNING');
    expect(mockPrisma.pomodoroSession.create).toHaveBeenCalled();
  });

  test('POST /pomodoro/stop stops running session and updates stats', async () => {
    mockPrisma.pomodoroSession.findFirst.mockResolvedValue({
      id: 100,
      userId: 1,
      duration: 25,
      startTime: new Date(Date.now() - 24 * 60000),
      cycleType: 'WORK',
      status: 'RUNNING'
    });

    const app = createApp();
    const res = await request(app).post('/pomodoro/stop').send({ sessionId: 100 });

    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('COMPLETED');
    expect(mockPrisma.focusStatistic.upsert).toHaveBeenCalled();
  });

  test('GET /focus/stats returns stats payload', async () => {
    mockPrisma.focusStatistic.findMany.mockResolvedValue([
      {
        date: new Date(),
        totalTime: 40,
        pomodorosCompleted: 2
      }
    ]);
    mockPrisma.focusStatistic.findUnique.mockResolvedValue({ totalTime: 30 });
    mockPrisma.focusStatistic.aggregate.mockResolvedValue({ _sum: { totalTime: 300, pomodorosCompleted: 10 } });

    const app = createApp();
    const res = await request(app).get('/focus/stats?days=7');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dailyFocusMinutes');
    expect(res.body).toHaveProperty('weekly');
    expect(Array.isArray(res.body.weekly)).toBe(true);
  });
});

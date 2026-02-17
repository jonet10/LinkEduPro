const request = require('supertest');
const express = require('express');
const validate = require('../../src/middlewares/validate');
const { createLibraryBookSchema, reviewLibraryBookSchema } = require('../../src/services/validators');

describe('library validators integration', () => {
  const app = express();
  app.use(express.json());
  app.post('/books', validate(createLibraryBookSchema), (req, res) => res.status(201).json({ ok: true }));
  app.patch('/books/review', validate(reviewLibraryBookSchema), (req, res) => res.status(200).json({ ok: true }));

  test('rejects invalid create payload', async () => {
    const res = await request(app).post('/books').send({ title: 'A' });
    expect(res.status).toBe(400);
  });

  test('accepts valid create payload', async () => {
    const res = await request(app).post('/books').send({
      title: 'Physique NS4 Tome 1',
      subject: 'Physique',
      level: 'NS4',
      description: 'Revision complete'
    });
    expect(res.status).toBe(201);
  });

  test('accepts valid review payload', async () => {
    const res = await request(app).patch('/books/review').send({ status: 'APPROVED' });
    expect(res.status).toBe(200);
  });
});

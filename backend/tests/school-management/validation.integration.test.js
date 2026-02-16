const request = require('supertest');
const express = require('express');
const validate = require('../../src/middlewares/validate');
const { createSchoolSchema } = require('../../src/school-management/validators/school.validators');

describe('school create validation integration', () => {
  const app = express();
  app.use(express.json());
  app.post('/schools', validate(createSchoolSchema), (req, res) => res.status(201).json(req.body));

  test('rejects invalid payload', async () => {
    const response = await request(app).post('/schools').send({ name: 'A' });
    expect(response.status).toBe(400);
  });

  test('accepts valid payload', async () => {
    const response = await request(app).post('/schools').send({
      name: 'Link School',
      type: 'PRIVATE',
      phone: '50911111111',
      email: 'contact@school.test',
      address: 'Rue A #12',
      city: 'Port-au-Prince',
      country: 'Haiti',
      logo: '',
      adminFirstName: 'Admin',
      adminLastName: 'Ecole',
      adminPhone: ''
    });

    expect(response.status).toBe(201);
  });
});

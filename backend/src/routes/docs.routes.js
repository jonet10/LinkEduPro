const express = require('express');

const router = express.Router();

const openApi = {
  openapi: '3.0.3',
  info: {
    title: 'LinkEduPro API',
    version: '1.0.0'
  },
  servers: [{ url: '/api' }],
  paths: {
    '/community/admin/super-dashboard': {
      get: { summary: 'Super Admin global analytics', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } }
    },
    '/community/admin/teacher-invitations': {
      post: { summary: 'Create teacher invitation', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created' } } },
      get: { summary: 'List teacher invitations', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } }
    },
    '/auth/teacher/invite/{token}': {
      get: { summary: 'Validate invitation token', parameters: [{ in: 'path', name: 'token', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Valid' }, '404': { description: 'Invalid' } } }
    },
    '/auth/teacher/accept-invite': {
      post: { summary: 'Accept invitation and create teacher account', responses: { '201': { description: 'Created' } } }
    },
    '/community/blog/posts': {
      get: { summary: 'List posts with pagination/search', security: [{ bearerAuth: [] }] },
      post: { summary: 'Create post', security: [{ bearerAuth: [] }] }
    },
    '/community/blog/posts/{postId}/report': {
      post: { summary: 'Report post', security: [{ bearerAuth: [] }] }
    },
    '/community/teachers/verifications': {
      post: { summary: 'Submit teacher verification document', security: [{ bearerAuth: [] }] }
    },
    '/school-management/dashboard/super-admin': {
      get: { summary: 'School management global dashboard', security: [{ bearerAuth: [] }] }
    },
    '/v2/profile/me': {
      get: { summary: 'Get authenticated user extended profile', security: [{ bearerAuth: [] }] },
      patch: { summary: 'Update editable profile fields', security: [{ bearerAuth: [] }] }
    },
    '/v2/profile/photo': {
      post: { summary: 'Upload profile photo', security: [{ bearerAuth: [] }] }
    },
    '/v2/focus/music': {
      get: { summary: 'List focus music by level', security: [{ bearerAuth: [] }] }
    },
    '/v2/admin/dashboard': {
      get: { summary: 'v2 admin dashboard stats and content approval panel', security: [{ bearerAuth: [] }] }
    },
    '/search/advanced': {
      get: { summary: 'Advanced multi-category search with filters/pagination', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } }
    },
    '/search/suggestions': {
      get: { summary: 'Live search suggestions (autocomplete)', responses: { '200': { description: 'OK' } } }
    },
    '/search/history': {
      get: { summary: 'Last 5 searches for authenticated user', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } }
    },
    '/search/trending': {
      get: { summary: 'Most searched keywords', responses: { '200': { description: 'OK' } } }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

router.get('/openapi.json', (req, res) => {
  res.json(openApi);
});

module.exports = router;

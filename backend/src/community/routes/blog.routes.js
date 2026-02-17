const express = require('express');
const validate = require('../../middlewares/validate');
const { requireSuperAdmin, requireTeacherOrAdmin } = require('../middlewares/roles');
const { enforcePostLimit } = require('../middlewares/post-limit');
const { commentRateLimit } = require('../middlewares/comment-rate-limit');
const { uploadBlogImage } = require('../middlewares/upload');
const {
  createPost,
  updatePost,
  listPosts,
  approvePost,
  likePost,
  createComment,
  listComments,
  markCommentHelpful,
  reportPost,
  listReports,
  reviewReport,
  softDeletePost,
  listCategories,
  createCategory,
  listTags,
  createTag,
  uploadPostImage
} = require('../controllers/blog.controller');
const {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  reportPostSchema,
  reviewReportSchema,
  createCategorySchema,
  createTagSchema
} = require('../validators/community.validators');

const router = express.Router();

router.get('/posts', listPosts);
router.get('/categories', listCategories);
router.get('/tags', listTags);
router.post('/posts/upload-image', uploadBlogImage.single('image'), uploadPostImage);
router.post('/posts', enforcePostLimit, validate(createPostSchema), createPost);
router.patch('/posts/:postId', validate(updatePostSchema), updatePost);
router.post('/posts/:postId/like', likePost);
router.get('/posts/:postId/comments', listComments);
router.post('/posts/:postId/comments', commentRateLimit, validate(createCommentSchema), createComment);
router.post('/posts/:postId/report', validate(reportPostSchema), reportPost);
router.delete('/posts/:postId', softDeletePost);

router.patch('/posts/:postId/approve', requireTeacherOrAdmin, approvePost);
router.patch('/comments/:commentId/helpful', requireSuperAdmin, markCommentHelpful);
router.post('/categories', requireSuperAdmin, validate(createCategorySchema), createCategory);
router.post('/tags', requireSuperAdmin, validate(createTagSchema), createTag);
router.get('/reports', requireSuperAdmin, listReports);
router.patch('/reports/:reportId/review', requireSuperAdmin, validate(reviewReportSchema), reviewReport);

module.exports = router;

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
  likePost,
  createComment,
  reviewComment,
  reactToComment,
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
  uploadPostImage,
  getReviewSummary
} = require('../controllers/blog.controller');
const {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  commentReactionSchema,
  reviewCommentSchema,
  reportPostSchema,
  reviewReportSchema,
  createCategorySchema,
  createTagSchema
} = require('../validators/community.validators');

const router = express.Router();

router.get('/posts', listPosts);
router.get('/review-summary', requireTeacherOrAdmin, getReviewSummary);
router.get('/categories', listCategories);
router.get('/tags', listTags);
router.post('/posts/upload-image', uploadBlogImage.single('image'), uploadPostImage);
router.post('/posts', enforcePostLimit, validate(createPostSchema), createPost);
router.patch('/posts/:postId', validate(updatePostSchema), updatePost);
router.post('/posts/:postId/like', likePost);
router.get('/posts/:postId/comments', listComments);
router.post('/posts/:postId/comments', commentRateLimit, validate(createCommentSchema), createComment);
router.post('/comments/:commentId/reaction', validate(commentReactionSchema), reactToComment);
router.patch('/comments/:commentId/review', requireTeacherOrAdmin, validate(reviewCommentSchema), reviewComment);
router.post('/posts/:postId/report', validate(reportPostSchema), reportPost);
router.delete('/posts/:postId', softDeletePost);

router.patch('/comments/:commentId/helpful', requireSuperAdmin, markCommentHelpful);
router.post('/categories', requireSuperAdmin, validate(createCategorySchema), createCategory);
router.post('/tags', requireSuperAdmin, validate(createTagSchema), createTag);
router.get('/reports', requireSuperAdmin, listReports);
router.patch('/reports/:reportId/review', requireSuperAdmin, validate(reviewReportSchema), reviewReport);

module.exports = router;

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const commentController = require("../controllers/commentController");
const validateRequest = require("../middlewares/validateRequest");
const commentSchemas = require("../validators/commentSchemas");

// Public routes
router.get("/:parentType/:parentId", commentController.getComments);

// Protected routes
router.use(protect);

// User routes
router.post("/:parentType/:parentId", validateRequest(commentSchemas.createComment), commentController.createComment);
router.delete("/:id", commentController.deleteComment);

// Admin routes
router.put("/:id/status", authorize("admin"), validateRequest(commentSchemas.updateStatus), commentController.updateCommentStatus);

module.exports = router;

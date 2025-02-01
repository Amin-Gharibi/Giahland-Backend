const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const commentController = require("../controllers/commentController");
const validateRequest = require("../middlewares/validateRequest");
const commentSchemas = require("../validators/commentSchemas");

// User routes
router.delete("/:id", protect, commentController.deleteComment);

// Admin routes
router.get("/admin/all", protect, authorize("admin"), commentController.getAllCommentsForAdmin);
router.put("/:id/status", protect, authorize("admin"), validateRequest(commentSchemas.updateStatus), commentController.updateCommentStatus);

// Public routes
router.get("/:parentType/:parentId", commentController.getComments);
router.post("/:parentType/:parentId", protect, validateRequest(commentSchemas.createComment), commentController.createComment);

module.exports = router;

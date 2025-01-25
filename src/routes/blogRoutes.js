const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const blogController = require("../controllers/blogController");
const validateRequest = require("../middlewares/validateRequest");
const blogSchemas = require("../validators/blogSchemas");

// Public routes
router.get("/", blogController.getBlogs);
router.get("/:id", blogController.getBlogById);

// Protected routes
router.use(protect);
router.use(authorize("admin", "author"));

router.post("/", validateRequest(blogSchemas.create), blogController.createBlog);
router.put("/:id", validateRequest(blogSchemas.update), blogController.updateBlog);
router.delete("/:id", blogController.deleteBlog);

module.exports = router;

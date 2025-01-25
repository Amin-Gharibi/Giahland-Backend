const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const categoryController = require("../controllers/categoryController");
const validateRequest = require("../middlewares/validateRequest");
const categorySchemas = require("../validators/categorySchemas");

// Public routes
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);

// Admin routes
router.use(protect);
router.use(authorize("admin"));

router.post("/", validateRequest(categorySchemas.create), categoryController.createCategory);
router.put("/:id", validateRequest(categorySchemas.update), categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;

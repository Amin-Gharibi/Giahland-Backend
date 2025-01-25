const express = require("express");
const router = express.Router();
const { createProduct, updateProduct, getProducts, getProductById } = require("../controllers/product");
const validateRequest = require("../middlewares/validateRequest");
const productSchemas = require("../validators/product");
const { protect, authorize } = require("../middlewares/auth");

router.get("/", getProducts);
router.get("/:id", getProductById);

router.use(protect);
router.post("/", authorize("seller"), validateRequest(productSchemas.createProduct), createProduct);
router.put("/:id", authorize("seller"), validateRequest(productSchemas.updateProduct), updateProduct);

module.exports = router;

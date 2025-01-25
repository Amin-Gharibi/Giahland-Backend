const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const orderController = require("../controllers/orderController");
const validateRequest = require("../middlewares/validateRequest");
const orderSchemas = require("../validators/orderSchemas");

router.use(protect);

// Customer routes
router.post("/", validateRequest(orderSchemas.create), orderController.createOrder);
router.get("/me", orderController.getMyOrders);
router.get("/:id", orderController.getOrderById);

// Seller routes
router.use(authorize("seller"));
router.get("/seller-orders", orderController.getSellerOrders);
router.put("/:id/status", validateRequest(orderSchemas.updateStatus), orderController.updateOrderStatus);

module.exports = router;

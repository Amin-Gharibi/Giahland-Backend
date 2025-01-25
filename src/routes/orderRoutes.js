const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const orderController = require("../controllers/orderController");
const validateRequest = require("../middlewares/validateRequest");
const orderSchemas = require("../validators/orderSchemas");

router.use(protect);

// Customer routes
router.post("/", validateRequest(orderSchemas.create), orderController.createOrder);
router.get("/my-orders", orderController.getMyOrders);
router.get("/:id", orderController.getOrderById);

// Seller routes
router.get("/seller-orders", authorize("seller"), orderController.getSellerOrders);
router.put("/:id/status", authorize("seller"), validateRequest(orderSchemas.updateStatus), orderController.updateOrderStatus);

module.exports = router;

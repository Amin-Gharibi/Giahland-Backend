const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");
const cartController = require("../controllers/cartController");
const validateRequest = require("../middlewares/validateRequest");
const cartSchemas = require("../validators/cartSchemas");

router.use(protect);

router.get("/", cartController.getCart);
router.post("/items", validateRequest(cartSchemas.addItem), cartController.addItem);
router.put("/items/:id", validateRequest(cartSchemas.updateItem), cartController.updateItem);
router.delete("/items/:id", cartController.removeItem);
router.delete("/", cartController.clearCart);

module.exports = router;

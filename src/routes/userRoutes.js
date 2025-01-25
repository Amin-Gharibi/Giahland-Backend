const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");
const userController = require("../controllers/userController");
const validateRequest = require("../middlewares/validateRequest");
const userSchemas = require("../validators/userSchemas");

router.use(protect); // All routes require authentication

router.get("/me", userController.getMe);
router.put("/profile", validateRequest(userSchemas.updateProfile), userController.updateProfile);
router.put("/password", validateRequest(userSchemas.updatePassword), userController.updatePassword);
router.get("/addresses", userController.getAddresses);
router.post("/addresses", validateRequest(userSchemas.createAddress), userController.createAddress);
router.put("/addresses/:id", validateRequest(userSchemas.updateAddress), userController.updateAddress);
router.delete("/addresses/:id", userController.deleteAddress);

module.exports = router;

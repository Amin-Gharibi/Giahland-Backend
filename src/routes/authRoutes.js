const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth");
const authController = require("../controllers/authController");
const validateRequest = require("../middlewares/validateRequest");
const authSchemas = require("../validators/authSchemas");

router.post("/register", validateRequest(authSchemas.register), authController.register);
router.post("/login", validateRequest(authSchemas.login), authController.login);
router.post("/verify-email", validateRequest(authSchemas.verifyEmail), authController.verifyEmail);
router.post("/refresh-token", validateRequest(authSchemas.refreshToken), authController.refreshToken);
router.post("/forgot-password", validateRequest(authSchemas.forgotPassword), authController.forgotPassword);
router.post("/reset-password", validateRequest(authSchemas.resetPassword), authController.resetPassword);

module.exports = router;

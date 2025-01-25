const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validateRequest = require("../middlewares/validateRequest");
const authSchemas = require("../validators/authSchemas");
const { protect } = require("../middlewares/auth");

router.post("/register", validateRequest(authSchemas.register), authController.register);
router.post("/login", validateRequest(authSchemas.login), authController.login);
router.post("/refresh-token", validateRequest(authSchemas.refreshToken), authController.refreshToken);
router.post("/forgot-password", validateRequest(authSchemas.forgotPassword), authController.forgotPassword);
router.post("/reset-password", validateRequest(authSchemas.resetPassword), authController.resetPassword);

router.use(protect)
router.post("/req-code", authController.requestVerificationCode);
router.post("/verify-email", validateRequest(authSchemas.verifyEmail), authController.verifyEmail);

module.exports = router;

const express = require("express");
const router = express.Router();
const { register, login, getMe, updateProfile, updatePassword } = require("../controllers/user");
const validateRequest = require("../middlewares/validateRequest");
const userSchemas = require("../validators/user");
const { protect } = require("../middlewares/auth");

// Public routes
router.post("/register", validateRequest(userSchemas.register), register);
router.post("/login", validateRequest(userSchemas.login), login);

// Protected routes
router.use(protect);
router.get("/me", getMe);
router.put("/profile", validateRequest(userSchemas.updateProfile), updateProfile);
router.put("/password", validateRequest(userSchemas.updatePassword), updatePassword);

module.exports = router;

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const userController = require("../controllers/userController");
const validateRequest = require("../middlewares/validateRequest");
const userSchemas = require("../validators/userSchemas");
const upload = require("../config/multer");

router.use(protect); // All routes require authentication

router.get("/me", userController.getMe);
router.put("/profile", validateRequest(userSchemas.updateProfile), userController.updateProfile);
router.put("/password", validateRequest(userSchemas.updatePassword), userController.updatePassword);
router.get("/addresses", userController.getAddresses);
router.post("/addresses", validateRequest(userSchemas.createAddress), userController.createAddress);
router.get("/addresses/:id", userController.getAddressById);
router.put("/addresses/:id", validateRequest(userSchemas.updateAddress), userController.updateAddress);
router.delete("/addresses/:id", userController.deleteAddress);
router.put("/addresses/:id/default", userController.setDefaultAddress);
router.post("/profile-photo", upload.single("photo"), userController.uploadProfilePhoto);
router.delete("/profile-photo", userController.deleteProfilePhoto);

router.use(authorize("admin"));
router.get("/", userController.getUsers);

module.exports = router;

const express = require("express");
const router = express.Router();
const { registerAsSeller, updateSellerProfile, getSellerProfile, getSellerProducts } = require("../controllers/seller");
const validateRequest = require("../middlewares/validateRequest");
const sellerSchemas = require("../validators/seller");
const { protect } = require("../middlewares/auth");

router
    .route("/profile")
    .get(getSellerProfile)
    .put(validateRequest(sellerSchemas.updateSellerProfile), updateSellerProfile);

router.use(protect);

router.post("/register", validateRequest(sellerSchemas.registerSeller), registerAsSeller);

module.exports = router;

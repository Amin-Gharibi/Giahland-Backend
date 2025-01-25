const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/products", require("./productRoutes"));
router.use("/categories", require("./categoryRoutes"));
router.use("/sellers", require("./sellerRoutes"));
router.use("/orders", require("./orderRoutes"));
router.use("/cart", require("./cartRoutes"));
router.use("/blogs", require("./blogRoutes"));

module.exports = router;

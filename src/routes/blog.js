const express = require("express");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();
// Add your blog routes here
router.get("/", (req, res) => {
	res.json({ message: "Blog routes not implemented yet" });
});

module.exports = router;

const express = require("express");
const { register, login } = require("../controllers/userController");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Protected routes
router.use(protect); // All routes after this middleware will require authentication

router.get("/me", async (req, res) => {
	try {
		const result = await pool.query("SELECT id, first_name, last_name, email, phone_number, role FROM users WHERE id = $1", [req.user.id]);
		res.json(result.rows[0]);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
});

module.exports = router;

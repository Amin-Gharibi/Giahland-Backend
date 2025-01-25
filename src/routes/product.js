const express = require("express");
const { createProduct, getProducts } = require("../controllers/productController");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT p.*, c.fa_name as category_name, s.shop_name as seller_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN sellers s ON p.seller_id = s.id
       WHERE p.id = $1`,
			[req.params.id]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ message: "Product not found" });
		}

		res.json(result.rows[0]);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
});

// Protected routes
router.use(protect);
router.post("/", authorize("seller"), createProduct);

module.exports = router;

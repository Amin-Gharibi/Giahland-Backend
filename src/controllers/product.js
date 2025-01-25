const pool = require("../config/database");

exports.createProduct = async (req, res) => {
	const { name, price, description, categoryId } = req.body;

	try {
		// Check if user is a seller
		const sellerResult = await pool.query("SELECT id FROM sellers WHERE user_id = $1", [req.user.id]);

		if (sellerResult.rows.length === 0) {
			return res.status(403).json({ message: "Only sellers can create products" });
		}

		const result = await pool.query(
			`INSERT INTO products (seller_id, category_id, name, price, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
			[sellerResult.rows[0].id, categoryId, name, price, description]
		);

		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

exports.getProducts = async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT p.*, c.fa_name as category_name, s.shop_name as seller_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN sellers s ON p.seller_id = s.id
       WHERE p.status = 'active'`
		);

		res.json(result.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

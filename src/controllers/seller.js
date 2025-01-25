const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.registerAsSeller = async (req, res, next) => {
	const { shopName } = req.body;

	try {
		// Check if user is already a seller
		const existingSeller = await pool.query("SELECT * FROM sellers WHERE user_id = $1", [req.user.id]);

		if (existingSeller.rows.length > 0) {
			throw new APIError("User is already a seller", 400);
		}

		// Check if shop name is already taken
		const existingShopName = await pool.query("SELECT * FROM sellers WHERE shop_name = $1", [shopName]);

		if (existingShopName.rows.length > 0) {
			throw new APIError("Shop name is already taken", 400);
		}

		// Create seller profile
		const result = await pool.query(
			`INSERT INTO sellers (user_id, shop_name, status)
             VALUES ($1, $2, 'pending')
             RETURNING *`,
			[req.user.id, shopName]
		);

		// Update user role to seller
		await pool.query(
			`UPDATE users SET role = 'seller'
             WHERE id = $1`,
			[req.user.id]
		);

		res.status(201).json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.getSellerProfile = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT s.*, u.first_name, u.last_name, u.email
             FROM sellers s
             JOIN users u ON s.user_id = u.id
             WHERE s.user_id = $1`,
			[req.user.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Seller profile not found", 404);
		}

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.getSellerProducts = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT p.*, 
                    (SELECT json_agg(json_build_object('id', pi.id, 'url', pi.image_url))
                     FROM product_images pi 
                     WHERE pi.product_id = p.id) as images,
                    (SELECT json_agg(json_build_object('name', pf.name, 'value', pf.value))
                     FROM product_features pf 
                     WHERE pf.product_id = p.id) as features
             FROM products p
             JOIN sellers s ON p.seller_id = s.id
             WHERE s.user_id = $1
             ORDER BY p.created_at DESC`,
			[req.user.id]
		);

		res.json({
			success: true,
			data: result.rows,
		});
	} catch (error) {
		next(error);
	}
};

exports.updateSellerProfile = async (req, res, next) => {
	const { shopName } = req.body;

	try {
		const result = await pool.query(
			`UPDATE sellers
             SET shop_name = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2
             RETURNING *`,
			[shopName, req.user.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Seller profile not found", 404);
		}

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.getCart = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT ci.*, p.name, p.price, p.description 
             FROM cart_items ci 
             JOIN products p ON ci.product_id = p.id 
             WHERE ci.user_id = $1`,
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

exports.addItem = async (req, res, next) => {
	const { productId, quantity } = req.body;
	try {
		const productResult = await pool.query("SELECT id, stock FROM products WHERE id = $1", [productId]);

		if (productResult.rows.length === 0) {
			throw new APIError("Product not found", 404);
		}

		const product = productResult.rows[0];

		// Check if there's enough stock
		if (product.stock < quantity) {
			throw new APIError(`Not enough stock. Available: ${product.stock}`, 400);
		}

		const result = await pool.query(
			`INSERT INTO cart_items (user_id, product_id, quantity)
             VALUES ($1, $2, $3)
             RETURNING *`,
			[req.user.id, productId, quantity]
		);

		res.status(201).json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.updateItem = async (req, res, next) => {
	const { quantity } = req.body;
	try {
		const result = await pool.query(
			`UPDATE cart_items 
             SET quantity = COALESCE($1, quantity), 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
			[quantity, req.params.id, req.user.id]
		);
		if (result.rows.length === 0) {
			throw new APIError("Cart item not found", 404);
		}
		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.removeItem = async (req, res, next) => {
	try {
		const result = await pool.query(
			`DELETE FROM cart_items 
             WHERE id = $1 AND user_id = $2 
             RETURNING id`,
			[req.params.id, req.user.id]
		);
		if (result.rows.length === 0) {
			throw new APIError("Cart item not found", 404);
		}
		res.json({
			success: true,
			message: "Cart item removed successfully",
		});
	} catch (error) {
		next(error);
	}
};

exports.clearCart = async (req, res, next) => {
	try {
		await pool.query("DELETE FROM cart_items WHERE user_id = $1", [req.user.id]);
		res.json({
			success: true,
			message: "Cart cleared successfully",
		});
	} catch (error) {
		next(error);
	}
};

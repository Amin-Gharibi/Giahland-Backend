const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.createOrder = async (req, res, next) => {
	const { addressId, paymentMethod, items } = req.body;
	try {
		// Start transaction
		await pool.query("BEGIN");

		// Create order
		const orderResult = await pool.query(
			`INSERT INTO orders (user_id, address_id, payment_method, status)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
			[req.user.id, addressId, paymentMethod, "pending"]
		);

		const orderId = orderResult.rows[0].id;

		// Add items to order
		const itemValues = items.map((item) => `(${orderId}, ${item.productId}, ${item.quantity}, ${item.price})`).join(",");

		await pool.query(`
            INSERT INTO order_items (order_id, product_id, quantity, price)
            VALUES ${itemValues}
        `);

		// Commit transaction
		await pool.query("COMMIT");

		res.status(201).json({
			success: true,
			data: orderResult.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.getMyOrders = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT o.*, a.address, a.city, a.state, a.postal_code, a.country 
             FROM orders o 
             JOIN addresses a ON o.address_id = a.id 
             WHERE o.user_id = $1`,
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

exports.getOrderById = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT o.*, a.address, a.city, a.state, a.postal_code, a.country 
             FROM orders o 
             JOIN addresses a ON o.address_id = a.id 
             WHERE o.id = $1 AND o.user_id = $2`,
			[req.params.id, req.user.id]
		);
		if (result.rows.length === 0) {
			throw new APIError("Order not found", 404);
		}
		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.getSellerOrders = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT o.*, u.first_name, u.last_name, a.address, a.city, a.state, a.postal_code, a.country 
             FROM orders o 
             JOIN users u ON o.user_id = u.id 
             JOIN addresses a ON o.address_id = a.id 
             JOIN order_items oi ON o.id = oi.order_id 
             JOIN products p ON oi.product_id = p.id 
             WHERE p.seller_id = $1`,
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

exports.updateOrderStatus = async (req, res, next) => {
	const { status } = req.body;
	try {
		const result = await pool.query(
			`UPDATE orders 
             SET status = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND EXISTS (
                 SELECT 1 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = orders.id AND p.seller_id = $3
             )
             RETURNING *`,
			[status, req.params.id, req.user.id]
		);
		if (result.rows.length === 0) {
			throw new APIError("Order not found or you don't have permission to update it", 404);
		}
		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.getCart = async (req, res, next) => {
	try {
		const userId = req.user.id;

		// First ensure user has a cart
		let cartResult = await pool.query("SELECT id FROM carts WHERE user_id = $1", [userId]);

		// If no cart exists, create one
		if (cartResult.rows.length === 0) {
			cartResult = await pool.query("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", [userId]);
		}

		const cartId = cartResult.rows[0].id;

		// First, get all unique sellers for this cart
		const sellersQuery = `
            SELECT DISTINCT s.shop_name
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            JOIN sellers s ON p.seller_id = s.id
            WHERE ci.cart_id = $1
            ORDER BY s.shop_name
        `;

		const sellersResult = await pool.query(sellersQuery, [cartId]);
		const sellers = sellersResult.rows.map((row) => row.shop_name);

		// Get cart items with product details
		const itemsQuery = `
            SELECT 
                ci.id,
                ci.quantity,
                ci.price as price_per_item,
                p.id as product_id,
                p.name as product_name,
                p.description as product_description,
                p.stock as available_stock,
                p.status as product_status,
                s.shop_name as seller_name,
                (
                    SELECT json_build_object(
                        'id', pi.id,
                        'image_url', pi.image_url,
                        'is_main', pi.is_main
                    )
                    FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = true
                    LIMIT 1
                ) as main_image
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            JOIN sellers s ON p.seller_id = s.id
            WHERE ci.cart_id = $1
            ORDER BY ci.created_at DESC
        `;

		const result = await pool.query(itemsQuery, [cartId]);

		// Process items
		const items = result.rows.map((item) => ({
			id: item.id,
			productId: item.product_id,
			productName: item.product_name,
			description: item.product_description,
			quantity: item.quantity,
			pricePerItem: item.price_per_item,
			totalPrice: item.price_per_item * item.quantity,
			sellerName: item.seller_name,
			stock: item.available_stock,
			status: item.product_status,
			mainImage: item.main_image?.image_url || null,
		}));

		// Calculate totals
		const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
		const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

		res.json({
			success: true,
			data: {
				cartId: cartId,
				sellers: sellers,
				items: items,
				summary: {
					totalItems: totalItems,
					totalPrice: totalPrice,
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

const getOrCreateCart = async (userId, client) => {
	// Try to find existing cart
	const existingCart = await client.query("SELECT id FROM carts WHERE user_id = $1", [userId]);

	if (existingCart.rows.length > 0) {
		return existingCart.rows[0].id;
	}

	// Create new cart if none exists
	const newCart = await client.query("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", [userId]);

	return newCart.rows[0].id;
};

exports.addItem = async (req, res, next) => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const userId = req.user.id;
		const { productId, quantity } = req.body;

		// Get product details first
		const productResult = await client.query("SELECT id, price, stock FROM products WHERE id = $1", [productId]);

		if (productResult.rows.length === 0) {
			throw new APIError("Product not found", 404);
		}

		const product = productResult.rows[0];

		// Check stock availability
		if (product.stock < quantity) {
			throw new APIError("Not enough stock available", 400);
		}

		// Get or create cart
		const cartId = await getOrCreateCart(userId, client);

		// Check if product already exists in cart
		const existingItem = await client.query("SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2", [cartId, productId]);

		let result;
		if (existingItem.rows.length > 0) {
			// Update existing cart item
			result = await client.query(
				`UPDATE cart_items 
                SET quantity = $1, 
                    price = $2
                WHERE id = $3
                RETURNING id, quantity, price`,
				[quantity, product.price, existingItem.rows[0].id]
			);
		} else {
			// Add new cart item
			result = await client.query(
				`INSERT INTO cart_items (cart_id, product_id, quantity, price)
                VALUES ($1, $2, $3, $4)
                RETURNING id, quantity, price`,
				[cartId, productId, quantity, product.price]
			);
		}

		// Update cart's updated_at timestamp
		await client.query("UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [cartId]);

		await client.query("COMMIT");

		res.status(201).json({
			success: true,
			data: {
				cartItem: {
					id: result.rows[0].id,
					quantity: result.rows[0].quantity,
					price: result.rows[0].price,
				},
			},
		});
	} catch (error) {
		await client.query("ROLLBACK");
		next(error);
	} finally {
		client.release();
	}
};

exports.updateItem = async (req, res, next) => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const userId = req.user.id;
		const cartItemId = req.params.id;
		const { quantity } = req.body;

		// Verify item exists and belongs to user's cart
		const verifyQuery = `
            SELECT ci.id, p.stock, p.price 
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = $1 AND c.user_id = $2
        `;

		const verifyResult = await client.query(verifyQuery, [cartItemId, userId]);

		if (verifyResult.rows.length === 0) {
			throw new APIError("Cart item not found or doesn't belong to user", 404);
		}

		// Check stock availability
		if (verifyResult.rows[0].stock < quantity) {
			throw new APIError(`Only ${verifyResult.rows[0].stock} items available in stock`, 400);
		}

		// Update item quantity
		const updateResult = await client.query(
			`
            UPDATE cart_items 
            SET quantity = $1, 
                price = $2
            WHERE id = $3 
            RETURNING id, quantity, price
        `,
			[quantity, verifyResult.rows[0].price, cartItemId]
		);

		// Update cart timestamp
		await client.query(
			`
            UPDATE carts 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = $1
        `,
			[userId]
		);

		await client.query("COMMIT");

		res.json({
			success: true,
			data: updateResult.rows[0],
		});
	} catch (error) {
		await client.query("ROLLBACK");
		next(error);
	} finally {
		client.release();
	}
};

exports.removeItem = async (req, res, next) => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const userId = req.user.id;
		const cartItemId = req.params.id;

		// First, verify that the cart item belongs to the user's cart
		const deleteQuery = `
            DELETE FROM cart_items 
            WHERE id = $1 
            AND cart_id IN (
                SELECT id 
                FROM carts 
                WHERE user_id = $2
            )
            RETURNING id`;

		const result = await client.query(deleteQuery, [cartItemId, userId]);

		if (result.rows.length === 0) {
			throw new APIError("Cart item not found or doesn't belong to user", 404);
		}

		// Update cart's updated_at timestamp
		await client.query(
			`UPDATE carts 
             SET updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1`,
			[userId]
		);

		await client.query("COMMIT");

		res.json({
			success: true,
			message: "Item removed from cart successfully",
		});
	} catch (error) {
		await client.query("ROLLBACK");
		next(error);
	} finally {
		client.release();
	}
};

exports.clearCart = async (req, res, next) => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const userId = req.user.id;

		// First, find the user's cart
		const cartResult = await client.query("SELECT id FROM carts WHERE user_id = $1", [userId]);

		if (cartResult.rows.length > 0) {
			const cartId = cartResult.rows[0].id;

			// Delete all items from the cart
			await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

			// Update cart's timestamp
			await client.query("UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [cartId]);
		}

		await client.query("COMMIT");

		res.json({
			success: true,
			message: "Cart cleared successfully",
		});
	} catch (error) {
		await client.query("ROLLBACK");
		next(error);
	} finally {
		client.release();
	}
};

exports.checkProductInCart = async (req, res, next) => {
	try {
		const userId = req.user.id;
		const { productId } = req.params;

		// Check if product exists first
		const productCheck = await pool.query("SELECT id FROM products WHERE id = $1", [productId]);

		if (productCheck.rows.length === 0) {
			throw new APIError("Product not found", 404);
		}

		// Check if product is in cart
		const query = `
            SELECT 
                ci.id,
                ci.quantity,
                ci.price as cart_price,
                p.name as product_name,
                p.price as current_price,
                p.stock as available_stock,
                (
                    SELECT json_build_object(
                        'id', pi.id,
                        'image_url', pi.image_url,
                        'is_main', pi.is_main
                    )
                    FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = true
                    LIMIT 1
                ) as main_image
            FROM carts c
            JOIN cart_items ci ON c.id = ci.cart_id
            JOIN products p ON ci.product_id = p.id
            WHERE c.user_id = $1 AND ci.product_id = $2
        `;

		const result = await pool.query(query, [userId, productId]);

		res.json({
			success: true,
			data: {
				inCart: result.rows.length > 0,
				cartItem: result.rows[0] || null,
			},
		});
	} catch (error) {
		next(error);
	}
};

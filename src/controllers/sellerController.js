const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.getSellersList = async (req, res, next) => {
	try {
		const { limit = 10, offset = 0, status, sortBy = "created_at", order = "DESC" } = req.query;

		const params = [];
		let whereClause = "";

		// Add status filter if provided
		if (status) {
			params.push(status);
			whereClause = "WHERE s.status = $1";
		}

		// Validate sortBy to prevent SQL injection
		const allowedSortFields = ["created_at", "shop_name", "status", "rating"];
		const allowedOrders = ["ASC", "DESC"];

		if (!allowedSortFields.includes(sortBy)) {
			throw new APIError("Invalid sort field", 400);
		}
		if (!allowedOrders.includes(order.toUpperCase())) {
			throw new APIError("Invalid sort order", 400);
		}

		// Get total count for pagination
		const countQuery = `
            SELECT COUNT(*)
            FROM sellers s
            JOIN users u ON s.user_id = u.id
            ${whereClause}
        `;
		const totalCount = await pool.query(countQuery, params);

		// Clone params array for the main query
		const queryParams = [...params];
		queryParams.push(limit, offset);

		// Get sellers with pagination
		const query = `
            SELECT 
                s.id,
                s.shop_name,
                s.status,
                s.rating,
                s.created_at,
                s.updated_at,
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone_number,
                (
                    SELECT COUNT(*)
                    FROM products p
                    WHERE p.seller_id = s.id
                ) as total_products,
                (
                    SELECT COUNT(*)
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    JOIN products p ON oi.product_id = p.id
                    WHERE p.seller_id = s.id
                ) as total_orders,
                (
                    SELECT COALESCE(SUM(oi.quantity * oi.price), 0)
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    JOIN products p ON oi.product_id = p.id
                    WHERE p.seller_id = s.id
                ) as total_revenue
            FROM sellers s
            JOIN users u ON s.user_id = u.id
            ${whereClause}
            ORDER BY s.${sortBy} ${order}
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

		const result = await pool.query(query, queryParams);

		res.json({
			success: true,
			data: {
				sellers: result.rows,
				pagination: {
					total: parseInt(totalCount.rows[0].count),
					totalPages: Math.ceil(totalCount.rows[0].count / limit),
					limit: parseInt(limit),
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.addSeller = async (req, res, next) => {
	const { userId, shopName } = req.body;
	try {
		await pool.query("BEGIN");

		// Check if user exists and is not already a seller
		const userCheck = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

		if (userCheck.rows.length === 0) {
			throw new APIError("User not found", 404);
		}

		// Check if user is already a seller
		const existingSeller = await pool.query("SELECT * FROM sellers WHERE user_id = $1", [userId]);

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
             VALUES ($1, $2, 'active')
             RETURNING *`,
			[userId, shopName]
		);

		// Update user role to seller
		await pool.query(
			`UPDATE users 
             SET role = 'seller', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
			[userId]
		);

		await pool.query("COMMIT");

		res.status(201).json({
			success: true,
			data: result.rows[0],
			message: "Seller account created successfully",
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.getProfile = async (req, res, next) => {
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

exports.updateProfile = async (req, res, next) => {
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

exports.getOrders = async (req, res, next) => {
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

exports.getStatistics = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT 
                COUNT(*) AS total_orders,
                SUM(oi.quantity * oi.price) AS total_revenue,
                AVG(o.rating) AS average_rating
             FROM orders o
             JOIN order_items oi ON o.id = oi.order_id
             JOIN products p ON oi.product_id = p.id
             WHERE p.seller_id = $1`,
			[req.user.id]
		);

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.getSellerPublicProfile = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT s.*, u.first_name, u.last_name
             FROM sellers s
             JOIN users u ON s.user_id = u.id
             WHERE s.id = $1`,
			[req.params.id]
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
		const { limit = 10, offset = 0, sortBy = "created_at", order = "DESC", status, category, minPrice, maxPrice, search } = req.query;

		const params = [req.params.id]; // Start with seller ID
		let whereClause = "WHERE s.id = $1";
		let paramCount = 1;

		// Add status filter
		if (status) {
			paramCount++;
			params.push(status);
			whereClause += ` AND p.status = $${paramCount}`;
		}

		// Add category filter
		if (category) {
			paramCount++;
			params.push(category);
			whereClause += ` AND p.category_id = $${paramCount}`;
		}

		// Add price range filter
		if (minPrice !== undefined) {
			paramCount++;
			params.push(minPrice);
			whereClause += ` AND p.price >= $${paramCount}`;
		}
		if (maxPrice !== undefined) {
			paramCount++;
			params.push(maxPrice);
			whereClause += ` AND p.price <= $${paramCount}`;
		}

		// Add search filter
		if (search) {
			paramCount++;
			params.push(`%${search}%`);
			whereClause += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
		}

		// Validate sortBy to prevent SQL injection
		const allowedSortFields = ["created_at", "title", "price", "stock", "status"];
		const allowedOrders = ["ASC", "DESC"];

		if (!allowedSortFields.includes(sortBy)) {
			throw new APIError("Invalid sort field", 400);
		}
		if (!allowedOrders.includes(order.toUpperCase())) {
			throw new APIError("Invalid sort order", 400);
		}

		// Get total count for pagination
		const countQuery = `
            SELECT COUNT(*)
            FROM products p
            JOIN sellers s ON p.seller_id = s.id
            ${whereClause}
        `;
		const totalCount = await pool.query(countQuery, params);

		// Add pagination parameters
		params.push(limit, offset);

		// Get products with pagination and related data
		const query = `
            SELECT 
                p.id,
                p.title,
                p.description,
                p.price,
                p.stock,
                p.status,
                p.is_featured,
                p.is_best_seller,
                p.created_at,
                p.updated_at,
                c.id as category_id,
                c.fa_name as category_name,
                c.en_name as category_name_en,
                (
                    SELECT json_agg(json_build_object(
                        'id', pi.id,
                        'url', pi.image_url,
                        'is_main', pi.is_main
                    ))
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                ) as images,
                (
                    SELECT json_agg(json_build_object(
                        'name', pf.name,
                        'value', pf.value
                    ))
                    FROM product_features pf
                    WHERE pf.product_id = p.id
                ) as features,
                (
                    SELECT COUNT(*)
                    FROM order_items oi
                    WHERE oi.product_id = p.id
                ) as total_orders,
                (
                    SELECT COALESCE(AVG(r.rating), 0)
                    FROM reviews r
                    WHERE r.product_id = p.id
                ) as average_rating,
                (
                    SELECT COUNT(*)
                    FROM reviews r
                    WHERE r.product_id = p.id
                ) as review_count
            FROM products p
            JOIN sellers s ON p.seller_id = s.id
            LEFT JOIN categories c ON p.category_id = c.id
            ${whereClause}
            ORDER BY p.${sortBy} ${order}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `;

		const result = await pool.query(query, params);

		res.json({
			success: true,
			data: {
				products: result.rows.map((product) => ({
					...product,
					images: product.images || [],
					features: product.features || [],
					description: product.description.substring(0, 200) + (product.description.length > 200 ? "..." : ""), // Truncate description
				})),
				pagination: {
					total: parseInt(totalCount.rows[0].count),
					totalPages: Math.ceil(totalCount.rows[0].count / limit),
					limit: parseInt(limit),
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

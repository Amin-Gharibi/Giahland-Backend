const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.getProducts = async (req, res, next) => {
	try {
		const { page = 1, limit = 10, category, minPrice, maxPrice, sortBy = "created_at", order = "DESC" } = req.query;

		const offset = (page - 1) * limit;
		const params = [];
		let whereClause = "WHERE p.status = $1";
		params.push("active");

		// Add category filter
		if (category) {
			params.push(category);
			whereClause += ` AND p.category_id = $${params.length}`;
		}

		// Add price range filter
		if (minPrice !== undefined) {
			params.push(minPrice);
			whereClause += ` AND p.price >= $${params.length}`;
		}
		if (maxPrice !== undefined) {
			params.push(maxPrice);
			whereClause += ` AND p.price <= $${params.length}`;
		}

		// Validate sortBy to prevent SQL injection
		const allowedSortFields = ["created_at", "price", "name"];
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
            ${whereClause}
        `;
		const totalCount = await pool.query(countQuery, params);

		// Get products with pagination
		const query = `
            SELECT 
                p.id,
                p.name,
                p.price,
                p.description,
                p.stock,
                p.status,
                p.created_at,
                p.updated_at,
                c.fa_name as category_name,
                c.en_name as category_name_en,
                s.shop_name as seller_name,
                s.rating as seller_rating,
                (
                    SELECT json_agg(json_build_object(
                        'id', pi.id,
                        'image_url', pi.image_url,
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
                ) as features
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN sellers s ON p.seller_id = s.id
            ${whereClause}
            ORDER BY p.${sortBy} ${order}
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

		params.push(limit, offset);
		const result = await pool.query(query, params);

		res.json({
			success: true,
			data: {
				products: result.rows,
				pagination: {
					total: parseInt(totalCount.rows[0].count),
					currentPage: parseInt(page),
					totalPages: Math.ceil(totalCount.rows[0].count / limit),
					limit: parseInt(limit),
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.getProductById = async (req, res, next) => {
	try {
		const query = `
            SELECT 
                p.id,
                p.name,
                p.price,
                p.description,
                p.stock,
                p.status,
                p.created_at,
                p.updated_at,
                c.fa_name as category_name,
                c.en_name as category_name_en,
                s.shop_name as seller_name,
                s.rating as seller_rating,
                (
                    SELECT json_agg(json_build_object(
                        'id', pi.id,
                        'image_url', pi.image_url,
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
                ) as features
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN sellers s ON p.seller_id = s.id
            WHERE p.id = $1
        `;

		const result = await pool.query(query, [req.params.id]);

		if (result.rows.length === 0) {
			throw new APIError("Product not found", 404);
		}

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.createProduct = async (req, res, next) => {
	const { name, price, description, categoryId, stock, features } = req.body;

	try {
		// Start transaction
		await pool.query("BEGIN");

		// Get seller ID
		const sellerResult = await pool.query("SELECT id FROM sellers WHERE user_id = $1", [req.user.id]);

		if (sellerResult.rows.length === 0) {
			throw new APIError("Only sellers can create products", 403);
		}

		// Create product
		const productResult = await pool.query(
			`INSERT INTO products (
                seller_id, 
                category_id, 
                name, 
                price, 
                description,
                stock,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
			[sellerResult.rows[0].id, categoryId, name, price, description, stock, "active"]
		);

		// Add features if provided
		if (features && features.length > 0) {
			const featureValues = features.map((feature) => `(${productResult.rows[0].id}, ${feature.name}, ${feature.value})`).join(",");

			await pool.query(`
                INSERT INTO product_features (product_id, name, value)
                VALUES ${featureValues}
            `);
		}

		// Commit transaction
		await pool.query("COMMIT");

		res.status(201).json({
			success: true,
			data: productResult.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.updateProduct = async (req, res, next) => {
	const { name, price, description, categoryId, stock, status, features } = req.body;

	try {
		// Start transaction
		await pool.query("BEGIN");

		// Check if product exists and belongs to the seller
		const productCheck = await pool.query(
			`SELECT p.* 
             FROM products p
             JOIN sellers s ON p.seller_id = s.id
             WHERE p.id = $1 AND s.user_id = $2`,
			[req.params.id, req.user.id]
		);

		if (productCheck.rows.length === 0) {
			throw new APIError("Product not found or you don't have permission to update it", 404);
		}

		// Update product
		const updateFields = [];
		const updateValues = [];
		let valueCount = 1;

		if (name !== undefined) {
			updateFields.push(`name = $${valueCount}`);
			updateValues.push(name);
			valueCount++;
		}
		if (price !== undefined) {
			updateFields.push(`price = $${valueCount}`);
			updateValues.push(price);
			valueCount++;
		}
		if (description !== undefined) {
			updateFields.push(`description = $${valueCount}`);
			updateValues.push(description);
			valueCount++;
		}
		if (categoryId !== undefined) {
			updateFields.push(`category_id = $${valueCount}`);
			updateValues.push(categoryId);
			valueCount++;
		}
		if (stock !== undefined) {
			updateFields.push(`stock = $${valueCount}`);
			updateValues.push(stock);
			valueCount++;
		}
		if (status !== undefined) {
			updateFields.push(`status = $${valueCount}`);
			updateValues.push(status);
			valueCount++;
		}

		updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

		const productResult = await pool.query(
			`UPDATE products 
             SET ${updateFields.join(", ")}
             WHERE id = $${valueCount}
             RETURNING *`,
			[...updateValues, req.params.id]
		);

		// Update features if provided
		if (features) {
			// Delete existing features
			await pool.query("DELETE FROM product_features WHERE product_id = $1", [req.params.id]);

			// Add new features
			if (features.length > 0) {
				const featureValues = features.map((feature) => `(${req.params.id}, ${feature.name}, ${feature.value})`).join(",");

				await pool.query(`
                    INSERT INTO product_features (product_id, name, value)
                    VALUES ${featureValues}
                `);
			}
		}

		// Commit transaction
		await pool.query("COMMIT");

		res.json({
			success: true,
			data: productResult.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

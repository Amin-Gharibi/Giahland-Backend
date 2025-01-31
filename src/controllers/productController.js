const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");
const fs = require("fs");
const path = require("path");

exports.getProducts = async (req, res, next) => {
	try {
		const { limit = 10, offset = 0, category, minPrice, maxPrice, sortBy = "created_at", order = "DESC" } = req.query;

		const params = [];
		let whereClause = "WHERE p.status = $1";
		params.push("active");

		// Add category filter
		if (category) {
			params.push(category);
			whereClause += ` AND EXISTS (
                SELECT 1 FROM product_categories pc 
                WHERE pc.product_id = p.id AND pc.category_id = $${params.length}
            )`;
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
            SELECT COUNT(DISTINCT p.id) 
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
                s.shop_name as seller_name,
                s.rating as seller_rating,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', c.id,
                            'fa_name', c.fa_name,
                            'en_name', c.en_name
                        )
                    )
                    FROM categories c
                    JOIN product_categories pc ON c.id = pc.category_id
                    WHERE pc.product_id = p.id
                ) as categories,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', pi.id,
                            'image_url', pi.image_url,
                            'is_main', pi.is_main
                        )
                    )
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                ) as images,
                (
                    SELECT json_agg(
                        json_build_object(
                            'name', pf.name,
                            'value', pf.value
                        )
                    )
                    FROM product_features pf
                    WHERE pf.product_id = p.id
                ) as features
            FROM products p
            LEFT JOIN sellers s ON p.seller_id = s.id
            ${whereClause}
            GROUP BY p.id, s.shop_name, s.rating
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
                s.shop_name as seller_name,
                s.rating as seller_rating,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', c.id,
                            'fa_name', c.fa_name,
                            'en_name', c.en_name
                        )
                    )
                    FROM categories c
                    JOIN product_categories pc ON c.id = pc.category_id
                    WHERE pc.product_id = p.id
                ) as categories,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', pi.id,
                            'image_url', pi.image_url,
                            'is_main', pi.is_main
                        )
                    )
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                ) as images,
                (
                    SELECT json_agg(
                        json_build_object(
                            'name', pf.name,
                            'value', pf.value
                        )
                    )
                    FROM product_features pf
                    WHERE pf.product_id = p.id
                ) as features
            FROM products p
            LEFT JOIN sellers s ON p.seller_id = s.id
            WHERE p.id = $1
            GROUP BY p.id, s.shop_name, s.rating
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
	const { name, price, description, categories, stock, features } = req.body;

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
                name,
                price,
                description,
                stock,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
			[sellerResult.rows[0].id, name, price, description, stock, "active"]
		);

		// Add categories
		if (categories && categories.length > 0) {
			const categoryValues = categories.map((categoryId) => `('${productResult.rows[0].id}', '${categoryId}')`).join(",");

			await pool.query(`
                INSERT INTO product_categories (product_id, category_id)
                VALUES ${categoryValues}
            `);
		}

		// Add features if provided
		if (features && features.length > 0) {
			const featureValues = features.map((feature) => `('${productResult.rows[0].id}', '${feature.name}', '${feature.value}')`).join(",");

			await pool.query(`
                INSERT INTO product_features (product_id, name, value)
                VALUES ${featureValues}
            `);
		}

		// Fetch complete product with categories
		const result = await pool.query(
			`
            SELECT 
                p.*,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', c.id,
                            'fa_name', c.fa_name,
                            'en_name', c.en_name
                        )
                    )
                    FROM categories c
                    JOIN product_categories pc ON c.id = pc.category_id
                    WHERE pc.product_id = p.id
                ) as categories
            FROM products p
            WHERE p.id = $1
        `,
			[productResult.rows[0].id]
		);

		// Commit transaction
		await pool.query("COMMIT");

		res.status(201).json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.updateProduct = async (req, res, next) => {
	const { name, price, description, categories, stock, status, features } = req.body;

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

		// Update categories if provided
		if (categories) {
			// Delete existing categories
			await pool.query("DELETE FROM product_categories WHERE product_id = $1", [req.params.id]);

			// Add new categories
			if (categories.length > 0) {
				const categoryValues = categories.map((categoryId) => `('${req.params.id}', '${categoryId}')`).join(",");

				await pool.query(`
                    INSERT INTO product_categories (product_id, category_id)
                    VALUES ${categoryValues}
                `);
			}
		}

		// Update features if provided
		if (features) {
			// Delete existing features
			await pool.query("DELETE FROM product_features WHERE product_id = $1", [req.params.id]);

			// Add new features
			if (features.length > 0) {
				const featureValues = features.map((feature) => `('${req.params.id}', '${feature.name}', '${feature.value}')`).join(",");

				await pool.query(`
                    INSERT INTO product_features (product_id, name, value)
                    VALUES ${featureValues}
                `);
			}
		}

		// Fetch updated product with categories
		const result = await pool.query(
			`
            SELECT 
                p.*,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', c.id,
                            'fa_name', c.fa_name,
                            'en_name', c.en_name
                        )
                    )
                    FROM categories c
                    JOIN product_categories pc ON c.id = pc.category_id
                    WHERE pc.product_id = p.id
                ) as categories
            FROM products p
            WHERE p.id = $1
        `,
			[req.params.id]
		);

		// Commit transaction
		await pool.query("COMMIT");

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.deleteProduct = async (req, res, next) => {
	try {
		const result = await pool.query(
			`DELETE FROM products 
             WHERE id = $1 AND EXISTS (
                 SELECT 1 
                 FROM sellers s 
                 WHERE s.id = products.seller_id AND s.user_id = $2
             )
             RETURNING id`,
			[req.params.id, req.user.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Product not found or you don't have permission to delete it", 404);
		}

		res.json({
			success: true,
			message: "Product deleted successfully",
		});
	} catch (error) {
		next(error);
	}
};

exports.uploadImages = async (req, res, next) => {
	const { id } = req.params;
	const images = req.files;

	if (!images || images.length === 0) {
		return next(new APIError("No images uploaded", 400));
	}

	try {
		await pool.query("BEGIN");

		const productResult = await pool.query(
			`SELECT p.*, COUNT(pi.id) AS image_count 
             FROM products p 
             LEFT JOIN product_images pi ON pi.product_id = p.id 
             JOIN sellers s ON p.seller_id = s.id 
             WHERE p.id = $1 AND s.user_id = $2 
             GROUP BY p.id`,
			[id, req.user.id]
		);

		if (productResult.rows.length === 0) {
			throw new APIError("Product not found or you don't have permission to update it", 404);
		}

		const imageParams = [];
		let setMainImage = +productResult.rows[0].image_count === 0;
		const imagePlaceholders = images
			.map((image, index) => {
				imageParams.push(id, "/uploads/" + image.filename, setMainImage);
				setMainImage = false;
				return `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`;
			})
			.join(",");

		await pool.query(
			`INSERT INTO product_images (product_id, image_url, is_main) 
             VALUES ${imagePlaceholders}`,
			imageParams
		);

		await pool.query("COMMIT");

		res.status(201).json({
			success: true,
			message: "Images uploaded successfully",
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		req.files.forEach((file) => {
			fs.unlink(path.join("..", "..", file.path), (err) => {
				if (err) {
					console.error(`Error deleting file: ${file.path}`, err);
				}
			});
		});
		next(error);
	}
};

exports.deleteImage = async (req, res, next) => {
	try {
		const { id, imageId } = req.params;

		const imageResult = await pool.query(
			`SELECT id, is_main, image_url 
             FROM product_images 
             WHERE id = $1 AND product_id = $2`,
			[imageId, id]
		);

		console.log(imageResult.rows[0]);

		if (imageResult.rows.length === 0) {
			throw new APIError("Image not found or you don't have permission to delete it", 404);
		}

		await pool.query("BEGIN");

		await pool.query(
			`DELETE FROM product_images 
             WHERE id = $1 AND product_id = $2`,
			[imageId, id]
		);

		if (imageResult.rows[0].is_main) {
			const newMainImage = await pool.query(
				`UPDATE product_images 
                 SET is_main = true 
                 WHERE id = (
                     SELECT id FROM product_images 
                     WHERE product_id = $1 
                     ORDER BY id ASC 
                     LIMIT 1
                 ) RETURNING id`,
				[id]
			);
		}

		fs.unlink(path.join("..", "..", imageResult.rows[0].image_url), (err) => {
			if (err) {
				console.error(`Error deleting file: ${imageResult.rows[0].image_url}`, err);
			}
		});

		await pool.query("COMMIT");

		res.json({
			success: true,
			message: "Image deleted successfully",
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.getNewArrivals = async (req, res, next) => {
	try {
		const result = await pool.query(`
            SELECT 
                p.id,
                p.name,
                p.price,
                p.description,
                p.stock,
                p.status,
                p.created_at,
                p.updated_at,
                s.shop_name as seller_name,
                s.rating as seller_rating,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', c.id,
                            'fa_name', c.fa_name,
                            'en_name', c.en_name
                        )
                    )
                    FROM categories c
                    JOIN product_categories pc ON c.id = pc.category_id
                    WHERE pc.product_id = p.id
                ) as categories,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', pi.id,
                            'image_url', pi.image_url,
                            'is_main', pi.is_main
                        )
                    )
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                ) as images,
                (
                    SELECT json_agg(
                        json_build_object(
                            'name', pf.name,
                            'value', pf.value
                        )
                    )
                    FROM product_features pf
                    WHERE pf.product_id = p.id
                ) as features
            FROM products p
            LEFT JOIN sellers s ON p.seller_id = s.id
            WHERE p.status = 'active'
            GROUP BY p.id, s.shop_name, s.rating
            ORDER BY p.created_at DESC
            LIMIT 10`);

		res.json({
			success: true,
			data: result.rows,
		});
	} catch (error) {
		next(error);
	}
};

exports.getProductsByCategory = async (req, res, next) => {
	try {
		const { categoryId } = req.params;

		const result = await pool.query(
			`
            SELECT 
                p.id,
                p.name,
                p.price,
                p.description,
                p.stock,
                p.status,
                p.created_at,
                p.updated_at,
                s.shop_name as seller_name,
                s.rating as seller_rating,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', c.id,
                            'fa_name', c.fa_name,
                            'en_name', c.en_name
                        )
                    )
                    FROM categories c
                    JOIN product_categories pc ON c.id = pc.category_id
                    WHERE pc.product_id = p.id
                ) as categories,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', pi.id,
                            'image_url', pi.image_url,
                            'is_main', pi.is_main
                        )
                    )
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                ) as images,
                (
                    SELECT json_agg(
                        json_build_object(
                            'name', pf.name,
                            'value', pf.value
                        )
                    )
                    FROM product_features pf
                    WHERE pf.product_id = p.id
                ) as features
            FROM products p
            LEFT JOIN sellers s ON p.seller_id = s.id
            WHERE p.id IN (
                SELECT product_id 
                FROM product_categories 
                WHERE category_id = $1
            )
            AND p.status = 'active'
            GROUP BY p.id, s.shop_name, s.rating
            ORDER BY p.created_at DESC`,
			[categoryId]
		);

		res.json({
			success: true,
			data: result.rows,
		});
	} catch (error) {
		next(error);
	}
};

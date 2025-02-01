const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.getAllCommentsForAdmin = async (req, res, next) => {
	try {
		const { limit = 10, offset = 0, status, parentType, sortBy = "created_at", order = "DESC", search } = req.query;

		// Build query parameters and where clause
		const params = [];
		let whereClause = [];

		// Add status filter if provided
		if (status) {
			params.push(status);
			whereClause.push(`c.status = $${params.length}`);
		}

		// Add parent type filter if provided
		if (parentType) {
			// Validate parent type
			if (!["blog", "product"].includes(parentType.toLowerCase())) {
				throw new APIError("Invalid parent type. Must be 'blog' or 'product'", 400);
			}
			params.push(parentType.toLowerCase());
			whereClause.push(`c.parent_type = $${params.length}`);
		}

		// Add search filter if provided
		if (search) {
			params.push(`%${search}%`);
			whereClause.push(`(
                c.content ILIKE $${params.length} OR
                u.first_name ILIKE $${params.length} OR
                u.last_name ILIKE $${params.length} OR
                u.email ILIKE $${params.length}
            )`);
		}

		// Validate sortBy to prevent SQL injection
		const allowedSortFields = ["created_at", "updated_at", "status"];
		const allowedOrders = ["ASC", "DESC"];

		if (!allowedSortFields.includes(sortBy)) {
			throw new APIError("Invalid sort field", 400);
		}
		if (!allowedOrders.includes(order.toUpperCase())) {
			throw new APIError("Invalid sort order", 400);
		}

		// Combine where clauses
		const whereStatement = whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

		// Get total count for pagination
		const countQuery = `
            SELECT COUNT(*)
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            ${whereStatement}
        `;
		const totalCount = await pool.query(countQuery, params);

		// Clone params array and add pagination params
		const queryParams = [...params, limit, offset];

		// Get comments with all related information
		const query = `
            SELECT 
                c.id,
                c.content,
                c.rating,
                c.status,
                c.parent_type,
                c.parent_id,
                c.created_at,
                c.updated_at,
                json_build_object(
                    'id', u.id,
                    'first_name', u.first_name,
                    'last_name', u.last_name,
                    'email', u.email,
                    'profile_image_url', u.profile_image_url
                ) as user,
                CASE 
                    WHEN c.parent_type = 'product' THEN (
                        SELECT json_build_object(
                            'id', p.id,
                            'name', p.name
                        )
                        FROM products p
                        WHERE p.id = c.parent_id
                    )
                    WHEN c.parent_type = 'blog' THEN (
                        SELECT json_build_object(
                            'id', b.id,
                            'title', b.title
                        )
                        FROM blogs b
                        WHERE b.id = c.parent_id
                    )
                END as parent_item
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            ${whereStatement}
            ORDER BY c.${sortBy} ${order}
            LIMIT $${params.length + 1} 
            OFFSET $${params.length + 2}
        `;

		const result = await pool.query(query, queryParams);

		res.json({
			success: true,
			data: {
				comments: result.rows,
				pagination: {
					total: parseInt(totalCount.rows[0].count),
					totalPages: Math.ceil(totalCount.rows[0].count / limit),
					currentPage: Math.floor(offset / limit) + 1,
					limit: parseInt(limit),
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.getComments = async (req, res, next) => {
	try {
		const { parentType, parentId } = req.params;
		const { limit = 10, offset = 0, status } = req.query;

		// Validate parent type
		if (!["blog", "product"].includes(parentType)) {
			throw new APIError("Invalid parent type", 400);
		}

		let whereClause = "WHERE c.parent_type = $1 AND c.parent_id = $2";
		const params = [parentType, parentId];
		let paramCount = 2;

		// Add status filter for admin
		if (status && req.user?.role === "admin") {
			paramCount++;
			params.push(status);
			whereClause += ` AND c.status = $${paramCount}`;
		} else {
			// Non-admin users can only see approved comments
			whereClause += " AND c.status = 'approved'";
		}

		// Get total count
		const countResult = await pool.query(`SELECT COUNT(*) FROM comments c ${whereClause}`, params);

		// Get comments with user info
		params.push(limit, offset);
		const result = await pool.query(
			`SELECT 
                c.id,
                c.content,
                c.rating,
                c.status,
                c.created_at,
                c.updated_at,
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.profile_image_url
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
			params
		);

		res.json({
			success: true,
			data: {
				comments: result.rows,
				pagination: {
					total: parseInt(countResult.rows[0].count),
					totalPages: Math.ceil(countResult.rows[0].count / limit),
					limit: parseInt(limit),
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.createComment = async (req, res, next) => {
	try {
		const { parentType, parentId } = req.params;
		const { content, rating } = req.body;

		// Validate parent type
		if (!["blog", "product"].includes(parentType)) {
			throw new APIError("Invalid parent type", 400);
		}

		// Check if parent exists
		const parentCheck = await pool.query(`SELECT id FROM ${parentType}s WHERE id = $1`, [parentId]);

		if (parentCheck.rows.length === 0) {
			throw new APIError(`${parentType} not found`, 404);
		}

		// Create comment
		const result = await pool.query(
			`INSERT INTO comments (
                user_id, parent_type, parent_id, 
                content, rating, status
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
			[req.user.id, parentType, parentId, content, rating, req.user.role === "admin" ? "approved" : "pending"]
		);

		res.status(201).json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.deleteComment = async (req, res, next) => {
	try {
		const { id } = req.params;

		// Check if comment exists
		const comment = await pool.query(`SELECT * FROM comments WHERE id = $1`, [id]);

		if (comment.rows.length === 0) {
			throw new APIError("Comment not found", 404);
		}

		// Only owner or admin can delete
		if (comment.rows[0].user_id !== req.user.id && req.user.role !== "admin") {
			throw new APIError("Not authorized to delete this comment", 403);
		}

		await pool.query(`DELETE FROM comments WHERE id = $1`, [id]);

		res.json({
			success: true,
			message: "Comment deleted successfully",
		});
	} catch (error) {
		next(error);
	}
};

exports.updateCommentStatus = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { status } = req.body;

		const result = await pool.query(
			`UPDATE comments 
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
			[status, id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Comment not found", 404);
		}

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

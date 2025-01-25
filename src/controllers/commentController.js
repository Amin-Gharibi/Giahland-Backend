const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

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

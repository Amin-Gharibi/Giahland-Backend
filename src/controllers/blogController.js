const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.getBlogs = async (req, res, next) => {
	try {
		const { limit = 10, offset = 0, sortBy = "created_at", order = "DESC", category } = req.query;

		const params = [];
		let whereClause = "";

		// Add category filter if provided
		if (category) {
			params.push(category);
			whereClause = "WHERE b.category = $1";
		}

		// Validate sortBy to prevent SQL injection
		const allowedSortFields = ["created_at", "title", "views", "author_id"];
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
            FROM blogs b
            ${whereClause}
        `;
		const totalCount = await pool.query(countQuery, params);

		// Clone params array for the main query
		const queryParams = [...params];
		queryParams.push(limit, offset);

		// Get blogs with pagination and related data
		const query = `
            SELECT 
                b.id,
                b.title,
                b.content,
                b.category,
                b.views,
                b.created_at,
                b.updated_at,
                u.id as author_id,
                u.first_name as author_first_name,
                u.last_name as author_last_name,
                (
                    SELECT json_agg(json_build_object(
                        'id', i.id,
                        'url', i.image_url
                    ))
                    FROM blog_images i
                    WHERE i.blog_id = b.id
                ) as images,
                (
                    SELECT COUNT(*)
                    FROM blog_comments c
                    WHERE c.blog_id = b.id
                ) as comment_count,
                (
                    SELECT json_agg(t.name)
                    FROM blog_tags bt
                    JOIN tags t ON bt.tag_id = t.id
                    WHERE bt.blog_id = b.id
                ) as tags
            FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            ${whereClause}
            ORDER BY b.${sortBy} ${order}
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

		const result = await pool.query(query, queryParams);

		res.json({
			success: true,
			data: {
				blogs: result.rows.map((blog) => ({
					...blog,
					content: blog.content.substring(0, 200) + (blog.content.length > 200 ? "..." : ""), // Truncate content for list view
					tags: blog.tags || [],
					images: blog.images || [],
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

exports.getBlogById = async (req, res, next) => {
	try {
		const result = await pool.query("SELECT * FROM blogs WHERE id = $1", [req.params.id]);
		if (result.rows.length === 0) {
			throw new APIError("Blog not found", 404);
		}
		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.createBlog = async (req, res, next) => {
	const { title, content, authorId } = req.body;

	try {
		const result = await pool.query(
			`INSERT INTO blogs (title, content, author_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
			[title, content, authorId || req.user.id]
		);

		res.status(201).json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.updateBlog = async (req, res, next) => {
	const { title, content } = req.body;

	try {
		const result = await pool.query(
			`UPDATE blogs 
             SET title = COALESCE($1, title), 
                 content = COALESCE($2, content), 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
			[title, content, req.params.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Blog not found", 404);
		}

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.deleteBlog = async (req, res, next) => {
	try {
		const result = await pool.query(
			`DELETE FROM blogs 
             WHERE id = $1 
             RETURNING id`,
			[req.params.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Blog not found", 404);
		}

		res.json({
			success: true,
			message: "Blog deleted successfully",
		});
	} catch (error) {
		next(error);
	}
};

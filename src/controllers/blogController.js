const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");
const fs = require("fs");
const path = require("path");

exports.getBlogs = async (req, res, next) => {
	try {
		const { limit = 10, offset = 0, sortBy = "created_at", order = "DESC", q } = req.query;

		const params = [];
		let whereClause = "";

		if (q) {
			params.push(`%${q}%`);
			whereClause = `WHERE (b.title ILIKE $1 OR b.content ILIKE $1 OR b.en_title ILIKE $1)`;
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
                b.en_title,
                b.content,
                b.views,
                b.image_url,
                b.created_at,
                b.updated_at,
                u.id as author_id,
                u.first_name as author_first_name,
                u.last_name as author_last_name,
                (
                    SELECT COUNT(*)
                    FROM comments c
                    WHERE c.parent_type = 'blog' AND c.parent_id = b.id
                ) as comment_count
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
				})),
				pagination: {
					total: parseInt(totalCount.rows[0].count),
					totalPages: Math.ceil(totalCount.rows[0].count / limit),
					limit: parseInt(limit),
					offset: parseInt(offset),
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.getBlogById = async (req, res, next) => {
	try {
		const query = `
            SELECT 
                b.*,
                u.first_name as author_first_name,
                u.last_name as author_last_name
            FROM blogs b
            LEFT JOIN users u ON b.author_id = u.id
            WHERE b.id = $1
        `;
		const result = await pool.query(query, [req.params.id]);

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
	try {
		if (!req.file) {
			throw new APIError("Blog image is required", 400);
		}

		const { title, en_title, content, authorId } = req.body;
		const image_url = "/uploads/" + req.file.filename;

		const isEnTitleExist = await pool.query("SELECT 1 FROM blogs WHERE en_title = $1", [en_title]);
		if (isEnTitleExist.rows.length) {
			throw new APIError("en_title already exists", 400);
		}

		const result = await pool.query(
			`INSERT INTO blogs (title, en_title, content, author_id, image_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
			[title, en_title, content, authorId || req.user.id, image_url]
		);

		res.status(201).json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		// If there was an error and a file was uploaded, delete it
		if (req.file) {
			fs.unlink(path.join("..", "..", req.file.path), (err) => {
				if (err) {
					console.error(`Error deleting file: ${req.file.path}`, err);
				}
			});
		}
		next(error);
	}
};

exports.updateBlog = async (req, res, next) => {
	try {
		let image_url;
		if (req.file) {
			image_url = "/uploads/" + req.file.filename;
		}

		const { title, en_title, content } = req.body;
		let updateFields = [];
		const values = [];
		let paramCount = 1;

		if (title !== undefined) {
			updateFields.push(`title = $${paramCount}`);
			values.push(title);
			paramCount++;
		}

		if (en_title !== undefined) {
			const isEnTitleExist = await pool.query("SELECT 1 FROM blogs WHERE en_title = $1", [en_title]);
			if (isEnTitleExist.rows.length) {
				throw new APIError("en_title already exists", 400);
			}
			
			updateFields.push(`en_title = $${paramCount}`);
			values.push(en_title);
			paramCount++;
		}

		if (content !== undefined) {
			updateFields.push(`content = $${paramCount}`);
			values.push(content);
			paramCount++;
		}

		if (image_url) {
			updateFields.push(`image_url = $${paramCount}`);
			values.push(image_url);
			paramCount++;
		}

		updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

		// Get the old image URL before updating
		const oldImageResult = await pool.query("SELECT image_url FROM blogs WHERE id = $1", [req.params.id]);

		const result = await pool.query(
			`UPDATE blogs 
             SET ${updateFields.join(", ")}
             WHERE id = $${paramCount}
             RETURNING *`,
			[...values, req.params.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Blog not found", 404);
		}

		// If a new image was uploaded and update was successful, delete the old image
		if (image_url && oldImageResult.rows[0]) {
			fs.unlink(path.join("..", "..", oldImageResult.rows[0].image_url), (err) => {
				if (err) {
					console.error(`Error deleting old image: ${oldImageResult.rows[0].image_url}`, err);
				}
			});
		}

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		// If there was an error and a new file was uploaded, delete it
		if (req.file) {
			fs.unlink(path.join("..", "..", req.file.path), (err) => {
				if (err) {
					console.error(`Error deleting file: ${req.file.path}`, err);
				}
			});
		}
		next(error);
	}
};

exports.deleteBlog = async (req, res, next) => {
	try {
		// Get the image URL before deleting the blog
		const imageResult = await pool.query("SELECT image_url FROM blogs WHERE id = $1", [req.params.id]);

		const result = await pool.query(
			`DELETE FROM blogs 
             WHERE id = $1 
             RETURNING id`,
			[req.params.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Blog not found", 404);
		}

		// Delete the associated image file
		if (imageResult.rows[0] && imageResult.rows[0].image_url) {
			fs.unlink(path.join("..", "..", imageResult.rows[0].image_url), (err) => {
				if (err) {
					console.error(`Error deleting image: ${imageResult.rows[0].image_url}`, err);
				}
			});
		}

		res.json({
			success: true,
			message: "Blog deleted successfully",
		});
	} catch (error) {
		next(error);
	}
};

const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.getBlogs = async (req, res, next) => {
	try {
		const { limit = 10, offset = 0 } = req.query;

		const result = await pool.query(
			`SELECT * FROM blogs 
             ORDER BY created_at DESC 
             LIMIT $1 OFFSET $2`,
			[limit, offset]
		);

		res.json({
			success: true,
			data: result.rows,
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

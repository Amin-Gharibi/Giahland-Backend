const pool = require("../config/database");
const { APIError } = require("../middlewares/errorHandler");

exports.getCategories = async (req, res, next) => {
	try {
		const result = await pool.query("SELECT * FROM categories");
		res.json({
			success: true,
			data: result.rows,
		});
	} catch (error) {
		next(error);
	}
};

exports.getCategoryById = async (req, res, next) => {
	try {
		const result = await pool.query("SELECT * FROM categories WHERE id = $1", [req.params.id]);
		if (result.rows.length === 0) {
			throw new APIError("Category not found", 404);
		}
		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.createCategory = async (req, res, next) => {
	const { faName, enName } = req.body;
	try {
		const result = await pool.query(
			`INSERT INTO categories (fa_name, en_name)
             VALUES ($1, $2)
             RETURNING *`,
			[faName, enName]
		);
		res.status(201).json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.updateCategory = async (req, res, next) => {
	const { faName, enName } = req.body;
	try {
		const result = await pool.query(
			`UPDATE categories 
             SET fa_name = COALESCE($1, fa_name), 
                 en_name = COALESCE($2, en_name), 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
			[faName, enName, req.params.id]
		);
		if (result.rows.length === 0) {
			throw new APIError("Category not found", 404);
		}
		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.deleteCategory = async (req, res, next) => {
	try {
		const result = await pool.query(
			`DELETE FROM categories 
             WHERE id = $1 
             RETURNING id`,
			[req.params.id]
		);
		if (result.rows.length === 0) {
			throw new APIError("Category not found", 404);
		}
		res.json({
			success: true,
			message: "Category deleted successfully",
		});
	} catch (error) {
		next(error);
	}
};

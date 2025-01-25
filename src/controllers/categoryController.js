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
		await pool.query("BEGIN");

		// First check if the category exists
		const categoryCheck = await pool.query("SELECT * FROM categories WHERE id = $1", [req.params.id]);

		if (categoryCheck.rows.length === 0) {
			throw new APIError("Category not found", 404);
		}

		// Check if any products are using ONLY this category
		const productsWithSingleCategory = await pool.query(
			`
            SELECT p.id, p.name 
            FROM products p
            JOIN product_categories pc ON p.id = pc.product_id
            GROUP BY p.id, p.name
            HAVING COUNT(pc.category_id) = 1 
            AND EXISTS (
                SELECT 1 
                FROM product_categories 
                WHERE product_id = p.id 
                AND category_id = $1
            )
        `,
			[req.params.id]
		);

		if (productsWithSingleCategory.rows.length > 0) {
			// If there are products with only this category, prevent deletion
			throw new APIError(`Cannot delete category. The following products have this as their only category: ${productsWithSingleCategory.rows.map((p) => p.name).join(", ")}. Please assign another category to these products first.`, 400);
		}

		// Delete the category associations from product_categories
		await pool.query("DELETE FROM product_categories WHERE category_id = $1", [req.params.id]);

		// Finally delete the category
		const result = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING id", [req.params.id]);

		await pool.query("COMMIT");

		res.json({
			success: true,
			message: "Category deleted successfully",
			data: {
				id: result.rows[0].id,
				deletedAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

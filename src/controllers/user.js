const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { APIError } = require("../middlewares/errorHandler");
const config = require("../config/config");

exports.register = async (req, res, next) => {
	const { firstName, lastName, email, password, phoneNumber } = req.body;

	try {
		// Check if user exists
		const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

		if (userExists.rows.length > 0) {
			throw new APIError("User already exists", 400);
		}

		// Hash password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Create user
		const result = await pool.query(
			`INSERT INTO users (first_name, last_name, email, password_hash, phone_number)
             VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role`,
			[firstName, lastName, email, hashedPassword, phoneNumber]
		);

		// Generate JWT
		const token = jwt.sign({ id: result.rows[0].id, role: result.rows[0].role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

		res.status(201).json({
			success: true,
			token,
			user: {
				id: result.rows[0].id,
				email: result.rows[0].email,
				role: result.rows[0].role,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.login = async (req, res, next) => {
	const { email, password } = req.body;

	try {
		// Check if user exists
		const result = await pool.query("SELECT id, email, password_hash, role FROM users WHERE email = $1", [email]);

		if (result.rows.length === 0) {
			throw new APIError("Invalid credentials", 401);
		}

		// Check password
		const isMatch = await bcrypt.compare(password, result.rows[0].password_hash);

		if (!isMatch) {
			throw new APIError("Invalid credentials", 401);
		}

		// Generate JWT
		const token = jwt.sign({ id: result.rows[0].id, role: result.rows[0].role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

		res.json({
			success: true,
			token,
			user: {
				id: result.rows[0].id,
				email: result.rows[0].email,
				role: result.rows[0].role,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.getMe = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT 
                id, 
                first_name, 
                last_name, 
                email, 
                phone_number, 
                home_address, 
                home_phone_number, 
                role, 
                profile_image_url,
                created_at,
                updated_at
             FROM users 
             WHERE id = $1`,
			[req.user.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("User not found", 404);
		}

		// If user is a seller, get seller info
		let sellerInfo = null;
		if (result.rows[0].role === "seller") {
			const sellerResult = await pool.query("SELECT id, shop_name, rating, status FROM sellers WHERE user_id = $1", [req.user.id]);
			if (sellerResult.rows.length > 0) {
				sellerInfo = sellerResult.rows[0];
			}
		}

		res.json({
			success: true,
			data: {
				...result.rows[0],
				seller: sellerInfo,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.updateProfile = async (req, res, next) => {
	const { firstName, lastName, phoneNumber, homeAddress, homePhoneNumber } = req.body;

	try {
		const result = await pool.query(
			`UPDATE users 
             SET 
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone_number = COALESCE($3, phone_number),
                home_address = COALESCE($4, home_address),
                home_phone_number = COALESCE($5, home_phone_number),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING id, first_name, last_name, email, phone_number, home_address, home_phone_number, role`,
			[firstName, lastName, phoneNumber, homeAddress, homePhoneNumber, req.user.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("User not found", 404);
		}

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.updatePassword = async (req, res, next) => {
	const { currentPassword, newPassword } = req.body;

	try {
		// Get current user with password
		const user = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);

		// Check current password
		const isMatch = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
		if (!isMatch) {
			throw new APIError("Current password is incorrect", 401);
		}

		// Hash new password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(newPassword, salt);

		// Update password
		await pool.query(
			`UPDATE users 
             SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
			[hashedPassword, req.user.id]
		);

		res.json({
			success: true,
			message: "Password updated successfully",
		});
	} catch (error) {
		next(error);
	}
};

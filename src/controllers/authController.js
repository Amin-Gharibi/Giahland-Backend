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

exports.verifyEmail = async (req, res, next) => {
	const { token } = req.body;

	try {
		// Verify token
		const decoded = jwt.verify(token, config.jwt.secret);

		// Update user verification status
		await pool.query("UPDATE users SET is_verified = $1 WHERE id = $2", [true, decoded.id]);

		res.json({
			success: true,
			message: "Email verified successfully",
		});
	} catch (error) {
		next(error);
	}
};

exports.refreshToken = async (req, res, next) => {
	const { token } = req.body;

	if (!token) {
		return next(new APIError("Refresh token is required", 400));
	}

	try {
		// Verify the refresh token
		const decoded = jwt.verify(token, config.jwt.secret);

		// Check if the user exists
		const userResult = await pool.query("SELECT id, email, role FROM users WHERE id = $1", [decoded.id]);
		if (userResult.rows.length === 0) {
			throw new APIError("User not found", 404);
		}

		// Generate a new access token
		const newToken = jwt.sign({ id: userResult.rows[0].id, role: userResult.rows[0].role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

		res.json({
			success: true,
			token: newToken,
			user: {
				id: userResult.rows[0].id,
				email: userResult.rows[0].email,
				role: userResult.rows[0].role,
			},
		});
	} catch (err) {
		return next(new APIError("Invalid refresh token", 401));
	}
};

exports.forgotPassword = async (req, res, next) => {
	const { email } = req.body;

	try {
		// Check if user exists
		const result = await pool.query("SELECT id, email FROM users WHERE email = $1", [email]);

		if (result.rows.length === 0) {
			throw new APIError("User not found", 404);
		}

		// Generate reset token
		const resetToken = jwt.sign({ id: result.rows[0].id }, config.jwt.secret, { expiresIn: "1h" });

		// Send reset token via email (implement your email sending logic here)
		// sendResetEmail(result.rows[0].email, resetToken);

		res.json({
			success: true,
			message: "Reset token sent to email",
		});
	} catch (error) {
		next(error);
	}
};

exports.resetPassword = async (req, res, next) => {
	const { token, newPassword } = req.body;

	try {
		// Verify token
		const decoded = jwt.verify(token, config.jwt.secret);

		// Hash new password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(newPassword, salt);

		// Update user password
		await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, decoded.id]);

		res.json({
			success: true,
			message: "Password reset successfully",
		});
	} catch (error) {
		next(error);
	}
};

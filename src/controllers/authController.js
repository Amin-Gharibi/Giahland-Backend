const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { APIError } = require("../middlewares/errorHandler");
const config = require("../config/config");
const nodemailer = require("nodemailer");
const { generateVerificationCode } = require("../utils/helpers");

// Email transporter setup
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: config.email.user,
		pass: config.email.password,
	},
});

// Send verification email
const sendVerificationEmail = async (email, code) => {
	const mailOptions = {
		from: config.email.from,
		to: email,
		subject: "Email Verification - Giahland",
		html: `
            <h1>Email Verification</h1>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 15 minutes.</p>
        `,
	};

	await transporter.sendMail(mailOptions);
};

// Send forgot password token
const sendForgotPasswordToken = async (email, token) => {
	const mailOptions = {
		from: config.email.from,
		to: email,
		subject: "Reset Password - Giahland",
		html: `
            <h1>Forgot Password</h1>
            <p>Your Reset Password Token is: <strong>${token}</strong></p>
            <p>This Token will expire in 1 hour.</p>
        `,
	};

	await transporter.sendMail(mailOptions);
};

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

		// Begin transaction
		await pool.query("BEGIN");

		// Create user
		const result = await pool.query(
			`INSERT INTO users (
                first_name, 
                last_name, 
                email, 
                password_hash, 
                phone_number,
                is_verified
            ) VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, email, role`,
			[firstName, lastName, email, hashedPassword, phoneNumber, false]
		);

		// Generate access token
		const accessToken = jwt.sign(
			{
				id: result.rows[0].id,
				role: result.rows[0].role,
			},
			config.jwt.secret,
			{ expiresIn: config.jwt.expiresIn }
		);

		// Generate refresh token
		const refreshToken = jwt.sign(
			{
				id: result.rows[0].id,
				role: result.rows[0].role,
				tokenType: "refresh",
			},
			config.jwt.refreshSecret,
			{ expiresIn: config.jwt.refreshExpiresIn }
		);

		await pool.query(`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')`, [result.rows[0].id, refreshToken]);

		// Commit transaction
		await pool.query("COMMIT");

		res.status(201).json({
			success: true,
			accessToken,
			refreshToken,
			user: {
				id: result.rows[0].id,
				email: result.rows[0].email,
				role: result.rows[0].role,
				isVerified: result.rows[0].is_verified,
			},
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.login = async (req, res, next) => {
	const { email, password } = req.body;

	try {
		// Check if user exists
		const result = await pool.query(
			`SELECT id, email, password_hash, role, is_verified 
             FROM users WHERE email = $1`,
			[email]
		);

		if (result.rows.length === 0) {
			throw new APIError("Invalid credentials", 400);
		}

		// Check password
		const isMatch = await bcrypt.compare(password, result.rows[0].password_hash);

		if (!isMatch) {
			throw new APIError("Invalid credentials", 400);
		}

		// Generate access token
		const accessToken = jwt.sign(
			{
				id: result.rows[0].id,
				role: result.rows[0].role,
			},
			config.jwt.secret,
			{ expiresIn: config.jwt.expiresIn }
		);

		// Generate refresh token
		const refreshToken = jwt.sign(
			{
				id: result.rows[0].id,
				role: result.rows[0].role,
				tokenType: "refresh",
			},
			config.jwt.refreshSecret,
			{ expiresIn: config.jwt.refreshExpiresIn }
		);

		await pool.query(`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')`, [result.rows[0].id, refreshToken]);

		res.json({
			success: true,
			accessToken,
			refreshToken,
			user: {
				id: result.rows[0].id,
				email: result.rows[0].email,
				role: result.rows[0].role,
				isVerified: result.rows[0].is_verified,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.requestVerificationCode = async (req, res, next) => {
	try {
		// Get user
		const user = await pool.query("SELECT id, is_verified FROM users WHERE email = $1", [email]);

		if (user.rows.length === 0) {
			throw new APIError("User not found", 404);
		}

		if (user.rows[0].is_verified) {
			throw new APIError("Email already verified", 400);
		}

		// Check rate limiting
		const recentCodes = await pool.query(
			`SELECT COUNT(*) FROM email_verifications 
             WHERE user_id = $1 
             AND created_at > NOW() - INTERVAL '1 hour'`,
			[user.rows[0].id]
		);

		if (recentCodes.rows[0].count >= 5) {
			throw new APIError("Too many verification attempts. Please try again later.", 429);
		}

		// Generate verification code
		const verificationCode = generateVerificationCode();
		const expiresAt = new Date(Date.now() + 15 * 60000); // 15 minutes

		// Begin transaction
		await pool.query("BEGIN");

		// Store verification code
		await pool.query(
			`INSERT INTO email_verifications (
                user_id, 
                verification_code, 
                expires_at
            ) VALUES ($1, $2, $3)`,
			[result.rows[0].id, verificationCode, expiresAt]
		);

		// Commit transaction
		await pool.query("COMMIT");

		// Send verification email
		await sendVerificationEmail(req.user.email, verificationCode);
		res.status(201).json({
			sucess: true,
			message: "Verification Code Sent To User Email",
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.verifyEmail = async (req, res, next) => {
	const { code } = req.body;

	try {
		// Get user and verification code
		const result = await pool.query(
			`SELECT v.*, u.email 
             FROM email_verifications v
             JOIN users u ON u.id = v.user_id
             WHERE u.email = $1 
             AND v.verification_code = $2
             AND v.expires_at > NOW()
             AND v.attempts < 5
             ORDER BY v.created_at DESC
             LIMIT 1`,
			[req.user.email, code]
		);

		if (result.rows.length === 0) {
			throw new APIError("Invalid or expired verification code", 400);
		}

		// Begin transaction
		await pool.query("BEGIN");

		// Update user verification status
		await pool.query("UPDATE users SET is_verified = true WHERE id = $1", [result.rows[0].user_id]);

		// Delete all verification codes for this user
		await pool.query("DELETE FROM email_verifications WHERE user_id = $1", [result.rows[0].user_id]);

		// Commit transaction
		await pool.query("COMMIT");

		res.json({
			success: true,
			message: "Email verified successfully",
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.refreshToken = async (req, res, next) => {
	const { refreshToken } = req.body;

	try {
		// Verify the refresh token
		const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

		// Validate that this is actually a refresh token
		if (!decoded.tokenType || decoded.tokenType !== "refresh") {
			throw new APIError("Invalid refresh token", 401);
		}

		// Begin transaction
		await pool.query("BEGIN");

		// Check if token exists and is not revoked in database
		const tokenResult = await pool.query(
			`SELECT * FROM refresh_tokens 
             WHERE token = $1 
             AND is_revoked = false 
             AND expires_at > NOW()`,
			[refreshToken]
		);

		if (tokenResult.rows.length === 0) {
			throw new APIError("Invalid or expired refresh token", 401);
		}

		// Check if the user exists
		const userResult = await pool.query("SELECT id, email, role FROM users WHERE id = $1", [decoded.id]);
		if (userResult.rows.length === 0) {
			throw new APIError("User not found", 404);
		}

		// Revoke the old refresh token
		await pool.query("UPDATE refresh_tokens SET is_revoked = true WHERE token = $1", [refreshToken]);

		// Generate a new access token
		const newAccessToken = jwt.sign(
			{
				id: userResult.rows[0].id,
				role: userResult.rows[0].role,
			},
			config.jwt.secret,
			{ expiresIn: config.jwt.expiresIn }
		);

		// Generate a new refresh token
		const newRefreshToken = jwt.sign(
			{
				id: result.rows[0].id,
				role: result.rows[0].role,
				tokenType: "refresh",
			},
			config.jwt.refreshSecret,
			{ expiresIn: config.jwt.refreshExpiresIn }
		);

		// Store new refresh token in database
		await pool.query(
			`INSERT INTO refresh_tokens (user_id, token, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
			[userResult.rows[0].id, newRefreshToken]
		);

		// Commit transaction
		await pool.query("COMMIT");

		res.json({
			success: true,
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		});
	} catch (err) {
		await pool.query("ROLLBACK");
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

		// Send reset token via email
		sendForgotPasswordToken(email, resetToken);

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

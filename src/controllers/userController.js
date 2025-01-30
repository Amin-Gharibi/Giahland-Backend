const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const { APIError } = require("../middlewares/errorHandler");

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
				is_verified,
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
	const { firstName, lastName, phoneNumber, email, homeAddress, homePhoneNumber } = req.body;

	try {
		const emailChanged = req.user.email !== email;

		const isVerified = emailChanged ? false : req.user.is_verified;

		if (emailChanged) {
			const emailExists = await pool.query(`SELECT * FROM users WHERE email = $1 AND id != $2`, [email, req.user.id]);

			if (emailExists.rows.length > 0) {
				throw new APIError("Email already in use", 400);
			}
		}

		if (phoneNumber !== req.user.phoneNumber) {
			const phoneNumberExists = await pool.query(`SELECT * FROM users WHERE phone_number = $1 AND id != $2`, [phoneNumber, req.user.id])

			if (phoneNumberExists.rows.length > 0) {
				throw new APIError("Phone Number already in use", 400)
			}
		}

		const result = await pool.query(
			`UPDATE users 
             SET 
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone_number = COALESCE($3, phone_number),
				email = COALESCE($4, email),
                home_address = COALESCE($5, home_address),
                home_phone_number = COALESCE($6, home_phone_number),
				is_verified = $7,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING id, first_name, last_name, email, phone_number, email, home_address, home_phone_number, is_verified, role`,
			[firstName, lastName, phoneNumber, email, homeAddress, homePhoneNumber, isVerified, req.user.id]
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
			throw new APIError("Current password is incorrect", 400);
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

exports.getAddresses = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT * 
             FROM addresses 
             WHERE user_id = $1
			 ORDER BY is_default DESC, created_at DESC`,
			[req.user.id]
		);

		res.json({
			success: true,
			data: result.rows,
		});
	} catch (error) {
		next(error);
	}
};

exports.getAddressById = async (req, res, next) => {
	try {
		const result = await pool.query(
			`SELECT *
             FROM addresses 
             WHERE user_id = $1 AND id = $2`,
			[req.user.id, req.params.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Address not found", 404);
		}

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		next(error);
	}
};

exports.createAddress = async (req, res, next) => {
	const { address, city, province, postalCode, isDefault = false } = req.body;

	try {
		await pool.query("BEGIN");

		// If this address is being set as default, remove default from other addresses
		if (isDefault) {
			await pool.query(
				`UPDATE addresses 
                 SET is_default = false 
                 WHERE user_id = $1`,
				[req.user.id]
			);
		}

		const result = await pool.query(
			`INSERT INTO addresses (
                user_id, address, city, province, 
                postal_code, is_default
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
			[req.user.id, address, city, province, postalCode, isDefault]
		);

		await pool.query("COMMIT");

		res.status(201).json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.updateAddress = async (req, res, next) => {
	const { address, city, province, postalCode, isDefault } = req.body;

	try {
		await pool.query("BEGIN");

		// If this address is being set as default, remove default from other addresses
		if (isDefault) {
			await pool.query(
				`UPDATE addresses 
                 SET is_default = false 
                 WHERE user_id = $1 AND id != $2`,
				[req.user.id, req.params.id]
			);
		}

		const result = await pool.query(
			`UPDATE addresses 
             SET 
                address = COALESCE($1, address),
                city = COALESCE($2, city),
                province = COALESCE($3, province),
                postal_code = COALESCE($4, postal_code),
                is_default = COALESCE($5, is_default),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 AND user_id = $7
             RETURNING *`,
			[address, city, province, postalCode, isDefault, req.params.id, req.user.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Address not found", 404);
		}

		await pool.query("COMMIT");

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.setDefaultAddress = async (req, res, next) => {
	try {
		await pool.query("BEGIN");

		// Remove default from all other addresses
		await pool.query(
			`UPDATE addresses 
             SET is_default = false 
             WHERE user_id = $1`,
			[req.user.id]
		);

		// Set new default address
		const result = await pool.query(
			`UPDATE addresses 
             SET is_default = true,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
			[req.params.id, req.user.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Address not found", 404);
		}

		await pool.query("COMMIT");

		res.json({
			success: true,
			data: result.rows[0],
		});
	} catch (error) {
		await pool.query("ROLLBACK");
		next(error);
	}
};

exports.deleteAddress = async (req, res, next) => {
	try {
		const result = await pool.query(
			`DELETE FROM addresses 
             WHERE id = $1 AND user_id = $2 
             RETURNING id`,
			[req.params.id, req.user.id]
		);

		if (result.rows.length === 0) {
			throw new APIError("Address not found", 404);
		}

		res.json({
			success: true,
			message: "Address deleted successfully",
		});
	} catch (error) {
		next(error);
	}
};

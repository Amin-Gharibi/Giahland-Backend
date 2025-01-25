const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
	const { firstName, lastName, email, password, phoneNumber } = req.body;

	try {
		// Check if user exists
		const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

		if (userExists.rows.length > 0) {
			return res.status(400).json({ message: "User already exists" });
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
		const token = jwt.sign({ id: result.rows[0].id, role: result.rows[0].role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

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
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

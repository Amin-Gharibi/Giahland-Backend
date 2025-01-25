const jwt = require("jsonwebtoken");
const pool = require("../config/database");

exports.protect = async (req, res, next) => {
	try {
		let token;

		// Check for token in headers
		if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
			token = req.headers.authorization.split(" ")[1];
		}

		if (!token) {
			return res.status(401).json({ message: "Not authorized to access this route" });
		}

		try {
			// Verify token
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			// Get user from database
			const result = await pool.query("SELECT id, email, role FROM users WHERE id = $1", [decoded.id]);

			if (result.rows.length === 0) {
				return res.status(401).json({ message: "User not found" });
			}

			req.user = result.rows[0];
			next();
		} catch (error) {
			return res.status(401).json({ message: "Not authorized to access this route" });
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

exports.authorize = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return res.status(403).json({
				message: `User role ${req.user.role} is not authorized to access this route`,
			});
		}
		next();
	};
};

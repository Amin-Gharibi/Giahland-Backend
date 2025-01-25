const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { APIError } = require("./errorHandler");
const config = require("../config/config");

exports.protect = async (req, res, next) => {
	let token;

	if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
		token = req.headers.authorization.split(" ")[1];
	}

	if (!token) {
		return next(new APIError("Not authorized to access this route", 401));
	}

	try {
		const decoded = jwt.verify(token, config.jwt.secret);
		const user = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);

		if (user.rows.length === 0) {
			return next(new APIError("No user found with this id", 404));
		}

		req.user = user.rows[0];
		next();
	} catch (err) {
		return next(new APIError("Not authorized to access this route", 401));
	}
};

exports.authorize = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return next(new APIError(`User role ${req.user.role} is not authorized to access this route`, 403));
		}
		next();
	};
};

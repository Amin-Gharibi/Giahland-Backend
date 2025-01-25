const errorHandler = (err, req, res, next) => {
	// Log error for debugging
	console.error("Error:", {
		message: err.message,
		stack: err.stack,
		timestamp: new Date().toISOString(),
		path: req.path,
		method: req.method,
	});

	// Default error status and message
	let statusCode = err.statusCode || 500;
	let message = err.message || "Internal Server Error";

	// Handle specific types of errors
	if (err.name === "ValidationError") {
		statusCode = 400;
		message = Object.values(err.errors)
			.map((error) => error.message)
			.join(", ");
	}

	// Handle Postgres unique violation
	if (err.code === "23505") {
		statusCode = 400;
		message = "Duplicate entry found";
	}

	// Handle JWT errors
	if (err.name === "JsonWebTokenError") {
		statusCode = 401;
		message = "Invalid token";
	}

	if (err.name === "TokenExpiredError") {
		statusCode = 401;
		message = "Token expired";
	}

	// Handle file upload errors
	if (err.code === "LIMIT_FILE_SIZE") {
		statusCode = 400;
		message = "File size too large";
	}

	// Prepare error response
	const errorResponse = {
		success: false,
		error: {
			message,
			...(process.env.NODE_ENV === "development" && {
				stack: err.stack,
				details: err.details || null,
			}),
		},
	};

	// Send error response
	res.status(statusCode).json(errorResponse);
};

// Catch 404 errors
const notFound = (req, res, next) => {
	const error = new Error(`Not Found - ${req.originalUrl}`);
	error.statusCode = 404;
	next(error);
};

// Custom error class for API errors
class APIError extends Error {
	constructor(message, statusCode, details = null) {
		super(message);
		this.statusCode = statusCode;
		this.details = details;
		this.name = "APIError";
	}
}

module.exports = {
	errorHandler,
	notFound,
	APIError,
};

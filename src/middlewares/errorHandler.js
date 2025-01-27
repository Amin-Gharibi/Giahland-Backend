class APIError extends Error {
	constructor(message, statusCode, details = null) {
		super(message);
		this.statusCode = statusCode;
		this.details = details;
	}
}

const errorHandler = (err, req, res, next) => {
	let error = { ...err };
	error.message = err.message;

	// Log to console for dev
	console.log(err.stack);
	console.log("Details => ", err.details);

	if (err.name === "CastError") {
		const message = `Resource not found`;
		error = new APIError(message, 404);
	}

	if (err.name === "ValidationError") {
		const message = Object.values(err.errors).map((val) => val.message);
		error = new APIError(message, 400);
	}

	if (err.code === 11000) {
		const message = "Duplicate field value entered";
		error = new APIError(message, 400);
	}

	res.status(error.statusCode || 500).json({
		success: false,
		error: error.message || "Server Error",
	});
};

module.exports = { APIError, errorHandler };

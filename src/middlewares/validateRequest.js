const { APIError } = require("./errorHandler");

const validateRequest = (schema) => {
	return (req, res, next) => {
		const { error } = schema.validate(req.body, {
			abortEarly: false,
			stripUnknown: true,
		});

		if (error) {
			const details = error.details.map((err) => ({
				field: err.path[0],
				message: err.message,
			}));
			throw new APIError("Validation Error", 400, details);
		}

		next();
	};
};

module.exports = validateRequest;

const Joi = require("joi");

const sellerSchemas = {
	addSeller: Joi.object({
		userId: Joi.string().uuid().required().messages({
			"string.guid": "Invalid user ID format",
			"any.required": "User ID is required",
		}),
		shopName: Joi.string().min(3).max(50).required().messages({
			"string.min": "Shop name must be at least 3 characters long",
			"string.max": "Shop name cannot exceed 50 characters",
			"any.required": "Shop name is required",
		}),
	}),

	updateProfile: Joi.object({
		shopName: Joi.string().min(3).max(255).messages({
			"string.min": "Shop name must be at least 3 characters long",
			"string.max": "Shop name cannot exceed 255 characters",
		}),
	}),
};

module.exports = sellerSchemas;

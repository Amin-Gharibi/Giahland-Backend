const Joi = require("joi");

const sellerSchemas = {
	registerSeller: Joi.object({
		shopName: Joi.string().min(3).max(255).required().messages({
			"string.min": "Shop name must be at least 3 characters long",
			"string.max": "Shop name cannot exceed 255 characters",
			"any.required": "Shop name is required",
		}),
	}),

	updateSellerProfile: Joi.object({
		shopName: Joi.string().min(3).max(255).required().messages({
			"string.min": "Shop name must be at least 3 characters long",
			"string.max": "Shop name cannot exceed 255 characters",
			"any.required": "Shop name is required",
		}),
	}),
};

module.exports = sellerSchemas;

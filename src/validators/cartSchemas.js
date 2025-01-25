const Joi = require("joi");

const cartSchemas = {
	addItem: Joi.object({
		productId: Joi.string().uuid().required().messages({
			"string.guid": "Invalid product ID format",
			"any.required": "Product ID is required",
		}),
		quantity: Joi.number().integer().min(1).required().messages({
			"number.min": "Quantity must be at least 1",
			"any.required": "Quantity is required",
		}),
	}),

	updateItem: Joi.object({
		quantity: Joi.number().integer().min(1).required().messages({
			"number.min": "Quantity must be at least 1",
			"any.required": "Quantity is required",
		}),
	}),
};

module.exports = cartSchemas;

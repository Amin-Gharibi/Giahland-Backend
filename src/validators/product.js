const Joi = require("joi");

const productSchemas = {
	createProduct: Joi.object({
		name: Joi.string().min(3).max(255).required().messages({
			"string.min": "Product name must be at least 3 characters long",
			"string.max": "Product name cannot exceed 255 characters",
			"any.required": "Product name is required",
		}),
		price: Joi.number().positive().required().messages({
			"number.positive": "Price must be a positive number",
			"any.required": "Price is required",
		}),
		description: Joi.string().max(2000).allow("").messages({
			"string.max": "Description cannot exceed 2000 characters",
		}),
		categoryId: Joi.string().uuid().required().messages({
			"string.guid": "Invalid category ID format",
			"any.required": "Category ID is required",
		}),
		features: Joi.array().items(
			Joi.object({
				name: Joi.string().required(),
				value: Joi.string().required(),
			})
		),
		stock: Joi.number().integer().min(0).required().messages({
			"number.min": "Stock cannot be negative",
			"any.required": "Stock quantity is required",
		}),
	}),

	updateProduct: Joi.object({
		name: Joi.string().min(3).max(255),
		price: Joi.number().positive(),
		description: Joi.string().max(2000).allow(""),
		categoryId: Joi.string().uuid(),
		stock: Joi.number().integer().min(0),
		status: Joi.string().valid("active", "inactive", "out_of_stock"),
	}),
};

module.exports = productSchemas;

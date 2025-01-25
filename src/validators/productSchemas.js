const Joi = require("joi");

const productSchemas = {
	create: Joi.object({
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

	update: Joi.object({
		name: Joi.string().min(3).max(255).messages({
			"string.min": "Product name must be at least 3 characters long",
			"string.max": "Product name cannot exceed 255 characters",
		}),
		price: Joi.number().positive().messages({
			"number.positive": "Price must be a positive number",
		}),
		description: Joi.string().max(2000).allow("").messages({
			"string.max": "Description cannot exceed 2000 characters",
		}),
		categoryId: Joi.string().uuid().messages({
			"string.guid": "Invalid category ID format",
		}),
		stock: Joi.number().integer().min(0).messages({
			"number.min": "Stock cannot be negative",
		}),
		status: Joi.string().valid("active", "inactive", "out_of_stock").messages({
			"any.only": "Invalid status",
		}),
	}),
};

module.exports = productSchemas;

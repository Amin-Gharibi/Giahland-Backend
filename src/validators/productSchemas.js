const Joi = require("joi");

const productSchemas = {
	create: Joi.object({
		name: Joi.string().required().messages({
			"string.empty": "Name is required",
			"any.required": "Name is required",
		}),

		price: Joi.number().positive().required().messages({
			"number.base": "Price must be a number",
			"number.positive": "Price must be positive",
			"any.required": "Price is required",
		}),

		description: Joi.string().allow("").optional().messages({
			"string.base": "Description must be text",
		}),

		categories: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
			"array.base": "Categories must be an array",
			"array.min": "At least one category is required",
			"string.guid": "Invalid category ID format",
			"any.required": "Categories are required",
		}),

		stock: Joi.number().integer().min(0).default(0).messages({
			"number.base": "Stock must be a number",
			"number.integer": "Stock must be an integer",
			"number.min": "Stock cannot be negative",
		}),

		features: Joi.array()
			.items(
				Joi.object({
					name: Joi.string().required(),
					value: Joi.string().required(),
				})
			)
			.optional()
			.messages({
				"array.base": "Features must be an array",
				"object.base": "Each feature must be an object",
			}),
	}),

	update: Joi.object({
		name: Joi.string().optional().messages({
			"string.empty": "Name cannot be empty if provided",
		}),

		price: Joi.number().positive().optional().messages({
			"number.base": "Price must be a number",
			"number.positive": "Price must be positive",
		}),

		description: Joi.string().allow("").optional().messages({
			"string.base": "Description must be text",
		}),

		categories: Joi.array().items(Joi.string().uuid()).min(1).optional().messages({
			"array.base": "Categories must be an array",
			"array.min": "At least one category is required",
			"string.guid": "Invalid category ID format",
		}),

		stock: Joi.number().integer().min(0).optional().messages({
			"number.base": "Stock must be a number",
			"number.integer": "Stock must be an integer",
			"number.min": "Stock cannot be negative",
		}),

		status: Joi.string().valid("active", "inactive", "out_of_stock").optional().messages({
			"any.only": "Status must be either active, inactive, or out_of_stock",
		}),

		features: Joi.array()
			.items(
				Joi.object({
					name: Joi.string().required(),
					value: Joi.string().required(),
				})
			)
			.optional()
			.messages({
				"array.base": "Features must be an array",
				"object.base": "Each feature must be an object",
			}),
	}),

	uploadImages: Joi.object({
		images: Joi.array().min(1).max(5).required().message({
			"array.min": "You Must Select At Least One Image",
			"array.max": "You Must Select At Most 5 Images",
			"any.required": "Images Are Required!"
		})
	})
};

module.exports = productSchemas;

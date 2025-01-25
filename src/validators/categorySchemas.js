const Joi = require("joi");

const categorySchemas = {
	create: Joi.object({
		faName: Joi.string().min(3).max(255).required().messages({
			"string.min": "Category name must be at least 3 characters long",
			"string.max": "Category name cannot exceed 255 characters",
			"any.required": "Category name is required",
		}),
		enName: Joi.string().min(3).max(255).required().messages({
			"string.min": "Category name must be at least 3 characters long",
			"string.max": "Category name cannot exceed 255 characters",
			"any.required": "Category name is required",
		}),
	}),

	update: Joi.object({
		faName: Joi.string().min(3).max(255).messages({
			"string.min": "Category name must be at least 3 characters long",
			"string.max": "Category name cannot exceed 255 characters",
		}),
		enName: Joi.string().min(3).max(255).messages({
			"string.min": "Category name must be at least 3 characters long",
			"string.max": "Category name cannot exceed 255 characters",
		}),
	}),
};

module.exports = categorySchemas;

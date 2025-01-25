const Joi = require("joi");

const blogSchemas = {
	create: Joi.object({
		title: Joi.string().min(3).max(255).required().messages({
			"string.min": "Title must be at least 3 characters long",
			"string.max": "Title cannot exceed 255 characters",
			"any.required": "Title is required",
		}),
		content: Joi.string().required().messages({
			"any.required": "Content is required",
		}),
		authorId: Joi.string().uuid().messages({
			"string.guid": "Invalid author ID format",
		}),
	}),

	update: Joi.object({
		title: Joi.string().min(3).max(255).messages({
			"string.min": "Title must be at least 3 characters long",
			"string.max": "Title cannot exceed 255 characters",
		}),
		content: Joi.string(),
	}),
};

module.exports = blogSchemas;

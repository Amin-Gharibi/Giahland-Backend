const Joi = require("joi");

const commentSchemas = {
	createComment: Joi.object({
		content: Joi.string().required().min(2).max(1000).messages({
			"string.empty": "Comment content is required",
			"string.min": "Comment must be at least 2 characters long",
			"string.max": "Comment cannot exceed 1000 characters",
			"any.required": "Comment content is required",
		}),
		rating: Joi.number().integer().min(1).max(5).required().messages({
			"number.base": "Rating must be a number",
			"number.min": "Rating must be at least 1",
			"number.max": "Rating cannot exceed 5",
			"any.required": "Rating is required",
		}),
	}),

	updateStatus: Joi.object({
		status: Joi.string().valid("pending", "approved", "rejected").required().messages({
			"any.only": "Invalid status value",
			"any.required": "Status is required",
		}),
	}),
};

module.exports = commentSchemas;

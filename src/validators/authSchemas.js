const Joi = require("joi");

const authSchemas = {
	register: Joi.object({
		firstName: Joi.string().min(2).max(50).required().messages({
			"string.min": "First name must be at least 2 characters long",
			"string.max": "First name cannot exceed 50 characters",
			"any.required": "First name is required",
		}),
		lastName: Joi.string().min(2).max(50).required().messages({
			"string.min": "Last name must be at least 2 characters long",
			"string.max": "Last name cannot exceed 50 characters",
			"any.required": "Last name is required",
		}),
		email: Joi.string().email().required().messages({
			"string.email": "Please provide a valid email address",
			"any.required": "Email is required",
		}),
		password: Joi.string()
			.min(8)
			.max(100)
			.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)
			.required()
			.messages({
				"string.min": "Password must be at least 8 characters long",
				"string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, and one number",
				"any.required": "Password is required",
			}),
		phoneNumber: Joi.string()
			.pattern(/^09[0-9]{9}$/)
			.required()
			.messages({
				"string.pattern.base": "Phone number must be a valid Iranian mobile number",
				"any.required": "Phone number is required",
			}),
	}),

	login: Joi.object({
		email: Joi.string().email().required().messages({
			"string.email": "Please provide a valid email address",
			"any.required": "Email is required",
		}),
		password: Joi.string().required().messages({
			"any.required": "Password is required",
		}),
	}),

	verifyEmail: Joi.object({
		code: Joi.string().required().messages({
			"any.required": "Code is required",
		}),
	}),

	refreshToken: Joi.object({
		refreshToken: Joi.string().required().messages({
			"any.required": "Refresh token is required",
		}),
	}),

	forgotPassword: Joi.object({
		email: Joi.string().email().required().messages({
			"string.email": "Please provide a valid email address",
			"any.required": "Email is required",
		}),
	}),

	resetPassword: Joi.object({
		token: Joi.string().required().messages({
			"any.required": "Token is required",
		}),
		newPassword: Joi.string()
			.min(8)
			.max(100)
			.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)
			.required()
			.messages({
				"string.min": "New password must be at least 8 characters long",
				"string.pattern.base": "New password must contain at least one uppercase letter, one lowercase letter, and one number",
				"any.required": "New password is required",
			}),
	}),
};

module.exports = authSchemas;

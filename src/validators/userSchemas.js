const Joi = require("joi");

const userSchemas = {
	updateProfile: Joi.object({
		firstName: Joi.string().min(2).max(50).messages({
			"string.min": "First name must be at least 2 characters long",
			"string.max": "First name cannot exceed 50 characters",
		}),
		lastName: Joi.string().min(2).max(50).messages({
			"string.min": "Last name must be at least 2 characters long",
			"string.max": "Last name cannot exceed 50 characters",
		}),
		phoneNumber: Joi.string()
			.pattern(/^09[0-9]{9}$/)
			.messages({
				"string.pattern.base": "Phone number must be a valid Iranian mobile number",
			}),
		homeAddress: Joi.string().max(500).messages({
			"string.max": "Home address cannot exceed 500 characters",
		}),
		homePhoneNumber: Joi.string()
			.pattern(/^0[0-9]{10}$/)
			.messages({
				"string.pattern.base": "Home phone number must be a valid Iranian phone number",
			}),
	}),

	updatePassword: Joi.object({
		currentPassword: Joi.string().required().messages({
			"any.required": "Current password is required",
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

	createAddress: Joi.object({
		address: Joi.string().max(500).required().messages({
			"string.max": "Address cannot exceed 500 characters",
			"any.required": "Address is required",
		}),
		city: Joi.string().max(100).required().messages({
			"string.max": "City cannot exceed 100 characters",
			"any.required": "City is required",
		}),
		province: Joi.string().max(100).required().messages({
			"string.max": "Province cannot exceed 100 characters",
			"any.required": "Province is required",
		}),
		postalCode: Joi.string().max(20).required().messages({
			"string.max": "Postal code cannot exceed 20 characters",
			"any.required": "Postal code is required",
		}),
	}),

	updateAddress: Joi.object({
		address: Joi.string().max(500).messages({
			"string.max": "Address cannot exceed 500 characters",
		}),
		city: Joi.string().max(100).messages({
			"string.max": "City cannot exceed 100 characters",
		}),
		province: Joi.string().max(100).messages({
			"string.max": "Province cannot exceed 100 characters",
		}),
		postalCode: Joi.string().max(20).messages({
			"string.max": "Postal code cannot exceed 20 characters",
		}),
	}),
};

module.exports = userSchemas;

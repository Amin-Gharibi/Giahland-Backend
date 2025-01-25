const Joi = require("joi");

const orderSchemas = {
	create: Joi.object({
		addressId: Joi.string().uuid().required().messages({
			"string.guid": "Invalid address ID format",
			"any.required": "Address ID is required",
		}),
		paymentMethod: Joi.string().valid("credit_card", "paypal", "bank_transfer").required().messages({
			"any.only": "Invalid payment method",
			"any.required": "Payment method is required",
		}),
		items: Joi.array()
			.items(
				Joi.object({
					productId: Joi.string().uuid().required().messages({
						"string.guid": "Invalid product ID format",
						"any.required": "Product ID is required",
					}),
					quantity: Joi.number().integer().min(1).required().messages({
						"number.min": "Quantity must be at least 1",
						"any.required": "Quantity is required",
					}),
					price: Joi.number().positive().required().messages({
						"number.positive": "Price must be a positive number",
						"any.required": "Price is required",
					}),
				})
			)
			.required()
			.messages({
				"any.required": "Items are required",
			}),
	}),

	updateStatus: Joi.object({
		status: Joi.string().valid("pending", "shipped", "delivered", "canceled").required().messages({
			"any.only": "Invalid status",
			"any.required": "Status is required",
		}),
	}),
};

module.exports = orderSchemas;

require("dotenv").config();

const config = {
	// Server configuration
	env: process.env.NODE_ENV || "development",
	port: process.env.PORT || 3000,

	// Database configuration
	db: {
		user: process.env.DB_USER || "giahland_user",
		password: process.env.DB_PASSWORD,
		name: process.env.DB_NAME || "giahland_db",
		host: process.env.DB_HOST || "localhost",
		port: parseInt(process.env.DB_PORT || "5432"),
		max: 20, // Maximum number of clients in the pool
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	},

	// JWT configuration
	jwt: {
		secret: process.env.JWT_SECRET || "secret-key",
		expiresIn: process.env.JWT_EXPIRE || "15m",
		refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret-key",
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
	},

	// CORS configuration
	cors: {
		origin: process.env.CORS_ORIGIN || "http://localhost:5173",
		credentials: true,
	},

	// File upload configuration
	upload: {
		maxSize: parseInt(process.env.MAX_FILE_SIZE || "5242880"), // 5MB in bytes
		path: process.env.UPLOAD_PATH || "uploads",
	},

	// Rate limiting
	rateLimit: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: parseInt(process.env.RATE_LIMIT_MAX || "100"), // limit each IP to 100 requests per windowMs
	},

	// Logging
	logging: {
		level: process.env.LOG_LEVEL || "debug",
	},

	// Email configuration
	email: {
		user: process.env.EMAIL_USER,
		password: process.env.EMAIL_PASSWORD,
		from: process.env.EMAIL_FROM,
	},
};

// Validate required configuration
const requiredConfig = ["db.user", "db.password", "db.name", "jwt.secret"];

const validateConfig = () => {
	const missingConfig = requiredConfig.filter((path) => {
		const value = path.split(".").reduce((obj, key) => obj && obj[key], config);
		return !value;
	});

	if (missingConfig.length > 0) {
		throw new Error(`Missing required config: ${missingConfig.join(", ")}`);
	}
};

try {
	validateConfig();
} catch (error) {
	console.error("Configuration Error:", error.message);
	process.exit(1);
}

module.exports = config;

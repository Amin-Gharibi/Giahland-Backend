const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
	user: config.db.user,
	host: config.db.host,
	database: config.db.name,
	password: config.db.password,
	port: config.db.port,
	max: 20, // Maximum number of clients in the pool
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
});

// Test database connection
pool.query("SELECT NOW()", (err) => {
	if (err) {
		console.error("Error connecting to the database:", err);
	} else {
		console.log("Successfully connected to PostgreSQL database");
	}
});

module.exports = pool;

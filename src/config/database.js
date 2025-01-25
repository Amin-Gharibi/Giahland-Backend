const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
	user: config.db.user,
	host: config.db.host,
	database: config.db.name,
	password: config.db.password,
	port: config.db.port,
	max: config.db.max,
	idleTimeoutMillis: config.db.idleTimeoutMillis,
	connectionTimeoutMillis: config.db.connectionTimeoutMillis,
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

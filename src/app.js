const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middlewares/errorHandler");
const swaggerUi = require("swagger-ui-express");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

const swaggerDocument = yaml.load(fs.readFileSync(path.resolve(__dirname, "../swagger.yaml"), "utf8"));

// Import routes
const indexRoutes = require("./routes/index");

const app = express();

// Middleware
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
		crossOriginEmbedderPolicy: false,
	})
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1500, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Swagger setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Medias route
app.use("/uploads", express.static(path.join(__dirname, "../", "uploads")));

// Routes
app.use("/api", indexRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

module.exports = app;

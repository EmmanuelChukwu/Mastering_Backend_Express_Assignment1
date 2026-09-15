const express = require("express");

const correlationId = require("./middleware/correlationId");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const userRoutes = require("./routes/user.routes");

const app = express();

app.use(express.json());

app.use(correlationId);
app.use(logger);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

app.use("/api/users", userRoutes);

app.use(errorHandler);

module.exports = app;
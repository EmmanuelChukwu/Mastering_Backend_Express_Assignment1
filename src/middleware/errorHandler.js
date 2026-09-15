const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error(
    JSON.stringify({
      event: "request_error",
      correlationId: req.correlationId,
      message: err.message,
      statusCode,
      timestamp: new Date().toISOString(),
    })
  );

  res.status(statusCode).json({
    success: false,
    error: {
      message:
        statusCode === 500
          ? "Internal server error"
          : err.message,
    },
    correlationId: req.correlationId,
  });
};

module.exports = errorHandler;
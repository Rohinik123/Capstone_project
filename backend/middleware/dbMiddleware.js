const mongoose = require("mongoose");

/**
 * Avoids Mongoose "buffering timed out" errors when the DB is down or still connecting.
 * Returns 503 with a clear message instead of hanging for 10s.
 */
const requireDb = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  res.status(503).json({
    message:
      "Database unavailable. Verify MONGO_URI on the server and MongoDB Atlas Network Access (allow your host IP or 0.0.0.0/0 for testing).",
  });
};

module.exports = { requireDb };

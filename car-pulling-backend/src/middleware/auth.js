const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  console.log('🔐 Auth Middleware: Checking token');
  console.log('📋 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');

  if (!token) {
    console.warn('⚠️ No token provided');
    return res.status(401).json({
      success: false,
      message: "No token provided. Please login first.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('✅ Token verified, user ID:', decoded.id || decoded.userId);
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
  }
};

const verifyTokenOptional = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token invalid but optional, continue
    }
  }

  next();
};

module.exports = { verifyToken, verifyTokenOptional };

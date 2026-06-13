import jwt from 'jsonwebtoken';

/**
 * Middleware: verifyToken
 * Reads Bearer token from Authorization header, verifies it with JWT_SECRET,
 * attaches decoded { userId, role, district } to req.user, then calls next().
 * Returns 401 if token is missing, malformed, or expired.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Token is malformed.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      district: decoded.district,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token has expired.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.',
    });
  }
};

export default verifyToken;

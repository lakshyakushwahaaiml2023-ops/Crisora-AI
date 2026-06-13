/**
 * Middleware factory: allowRoles(...roles)
 * Returns a middleware that checks if req.user.role is in the allowed list.
 * Must be used after verifyToken.
 * Returns 403 Forbidden if the user's role is not permitted.
 *
 * Usage:
 *   router.get('/admin-only', verifyToken, allowRoles('ndma', 'state_authority'), handler)
 */
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not authenticated.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. Required role(s): [${roles.join(', ')}]. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

export default allowRoles;

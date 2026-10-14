const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'g3_transport_super_secret_key_2026';

// Strict Admin Authorization Middleware
const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Unauthorized: Malformed token header' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify admin role or admin user
    if (decoded.role === 'admin' || decoded.user === 'admin' || decoded.username === 'admin.g3') {
      req.admin = decoded;
      req.user = decoded;
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin token' });
  }
};

// Customer Authentication Middleware
const requireCustomerAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Customer login required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Unauthorized: Malformed token header' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.customer_id && decoded.role !== 'customer') {
      // Check if it's an admin token acting with customer permissions
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: Invalid customer token' });
    }
    req.customer = decoded;
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired customer session' });
  }
};

module.exports = {
  requireAdminAuth,
  requireCustomerAuth,
  JWT_SECRET
};

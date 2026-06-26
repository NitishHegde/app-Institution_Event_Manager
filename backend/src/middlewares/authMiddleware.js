const jwt = require('jsonwebtoken');

// 1. Verify JWT Token Validity
const authenticateToken = (req, res, next) => {
    // Extract token from Authorization header (Format: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No session token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Contains { userId, role } from the login payload
        next();
    } catch (error) {
        res.status(403).json({ message: 'Session expired or invalid token.' });
    }
};

// 2. Enforce Role-Based Access Control (RBAC)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Forbidden: Access restricted to ${allowedRoles.join(' or ')} profiles.`
            });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
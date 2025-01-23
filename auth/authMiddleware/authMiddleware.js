const jwt = require('jsonwebtoken');
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Generates both access and refresh tokens
const generateTokens = (payload) => {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' }); // Valid for 7 days

    return { accessToken, refreshToken };
};


// Function to validate JWT token
const authenticateToken = (req, res, next) => {
    // Get the token from the request headers
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: true,
            message: 'Access denied, token missing!'
        });
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Check for specific expiration error
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ 
                    error: true,
                    message: 'Token has expired!'
                });
            }

            return res.status(403).json({ 
                error: true,
                message: 'Invalid token!'
            });
        }

        req.user = user;
        next();
    });
};


module.exports = {
    generateTokens,
    authenticateToken,
};

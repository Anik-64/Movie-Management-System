const express = require('express');
const { commonMiddlewares, createRateLimiter } = require('../middleware/commonMiddleware');
const { body, validationResult } = require('express-validator');
const admin = require('../config/config');
const { generateTokens } = require('./authMiddleware/authMiddleware');
const bcrypt = require('bcrypt');
const xss = require('xss');
require('dotenv').config();

const authRouter = express.Router();

// Security Middlewares
commonMiddlewares(authRouter);

// Rate Limiting
const authRouterLimiter = createRateLimiter();
authRouter.use(authRouterLimiter);

const db = admin.firestore();

// Username/Password Auth
authRouter.post('/register',
    [
        body('username')
            .notEmpty().withMessage('User name is required')
            .isString().withMessage('User name must be a string')
            .trim().escape()
            .isLength({ min: 3, max: 255 }).withMessage('User name must be between 3 to 255 characters long')
            .customSanitizer(value => xss(value))
            .custom(value => {
                if (/\s/.test(value)) {
                    throw new Error('Username must not contain spaces');
                }
                return true;
            }),
        body('email')
            .notEmpty().withMessage('Email is required')
            .isString().withMessage('Email must be a string')
            .trim().escape()
            .isEmail().withMessage('Invalid email format')
            .isLength({ max: 255 }).withMessage('Email must be at most 255 characters long')
            .customSanitizer(value => xss(value)),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isString().withMessage('Password must be a string')
            .trim().escape()
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
            .customSanitizer(value => xss(value)),
        body('role')
            .optional()
            .isString().withMessage('User role must be a string')
            .trim().escape()
            .isLength({ max: 10 }).withMessage('Role must be at most 10 characters long')
            .customSanitizer(value => xss(value)),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Map errors and return the first message
            const errorMessages = errors.array().map((err) => err.msg);
            return res.status(400).json({
                error: true,
                message: errorMessages[0],
            });
        }

        const { username, email, password, role } = req.body;

        try {
            // Check if the email already exists
            const emailQuerySnapshot = await db.collection('users').where('email', '==', email).get();
            if (!emailQuerySnapshot.empty) {
                return res.status(400).json({
                    error: true,
                    message: 'Email is already registered.',
                });
            }

            // Check if the username already exists
            const usernameQuerySnapshot = await db.collection('users').where('username', '==', username).get();
            if (!usernameQuerySnapshot.empty) {
                return res.status(400).json({
                    error: true,
                    message: 'Username is already taken.',
                });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create the user document
            const userRef = await db.collection('users').add({
                username,
                email,
                password: hashedPassword,
                role
            });

            res.status(201).json({
                error: false,
                message: 'User registered successfully',
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                error: true, 
                message: 'Failed to create user' 
            });
        }
    }
);

// Login With email password
authRouter.post('/login/emailpassword',
    [
        body('email')
            .notEmpty().withMessage('Email is required')
            .isString().withMessage('Email must be a string')
            .trim().escape()
            .isEmail().withMessage('Invalid email format')
            .isLength({ max: 255 }).withMessage('Email must be at most 255 characters long')
            .customSanitizer(value => xss(value)),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isString().withMessage('Password must be a string')
            .trim().escape()
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
            .customSanitizer(value => xss(value)),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Map errors and return the first message
            const errorMessages = errors.array().map((err) => err.msg);
            return res.status(400).json({
                error: true,
                message: errorMessages[0],
            });
        }

        const { email, password } = req.body;

        try {
            // Check user already exists
            const checkExistEmail = await db.collection('users').where('email', '==', email).get();

            if (checkExistEmail.empty) {
                return res.status(400).json({
                    error: true,
                    message: 'Please register first.',
                });
            }

            const user = checkExistEmail.docs[0].data();
            const docId = checkExistUsername.docs[0].id;

            // Verify the password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ 
                    error: true,
                    message: 'Invalid password.' 
                });
            }

            // Get current time
            const currentTime = new Date().toISOString();

            const payload = {
                id: docId, 
                role: user.role,
                currenttime: currentTime
            }; 
            
            // Generate JWT token and refresh token using generateTokens function
            const { accessToken, refreshToken } = generateTokens(payload);

            res.status(200).json({
                message: 'Login successful',
                token: accessToken,
                refreshToken: refreshToken
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                error: true, 
                message: 'Server error' 
            });
        }
    }
);

// Login With username password
authRouter.post('/login/usernamepassword',
    [
        body('username')
            .notEmpty().withMessage('User name is required')
            .isString().withMessage('User name must be a string')
            .trim().escape()
            .isLength({ min: 3, max: 255 }).withMessage('User name must be between 3 to 255 characters long')
            .customSanitizer(value => xss(value))
            .custom(value => {
                if (/\s/.test(value)) {
                    throw new Error('Username must not contain spaces');
                }
                return true;
            }),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isString().withMessage('Password must be a string')
            .trim().escape()
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
            .customSanitizer(value => xss(value)),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Map errors and return the first message
            const errorMessages = errors.array().map((err) => err.msg);
            return res.status(400).json({
                error: true,
                message: errorMessages[0],
            });
        }

        const { username, password } = req.body;

        try {
            // Check user already exists
            const checkExistUsername = await db.collection('users').where('username', '==', username).get();

            if (checkExistUsername.empty) {
                return res.status(400).json({
                    error: true,
                    message: 'Please register first.',
                });
            }

            const user = checkExistUsername.docs[0].data();
            const docId = checkExistUsername.docs[0].id;

            // Verify the password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ 
                    error: true,
                    message: 'Invalid password.' 
                });
            }

            // Get current time
            const currentTime = new Date().toISOString();

            const payload = {
                id: docId, 
                role: user.role,
                currenttime: currentTime
            }; 
            
            // Generate JWT token and refresh token using generateTokens function
            const { accessToken, refreshToken } = generateTokens(payload);

            res.status(200).json({
                message: 'Login successful',
                token: accessToken,
                refreshToken: refreshToken
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                error: true, 
                message: 'Server error.' 
            });
        }
    }
);

module.exports = authRouter;
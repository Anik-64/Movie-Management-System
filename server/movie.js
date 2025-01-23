const express = require('express');
const { commonMiddlewares, createRateLimiter } = require('../middleware/commonMiddleware');
const { body, param, validationResult } = require('express-validator');
const admin = require('../config/config');
const xss = require('xss');
// const bcrypt = require('bcrypt');

const movieRouter = express.Router();

// Security Middlewares
commonMiddlewares(movieRouter);

// Rate Limiting
const movieRouterLimiter = createRateLimiter();
movieRouter.use(movieRouterLimiter);

const db = admin.firestore();

// 1. Create a Movie
movieRouter.post('/create',
    [
        body('description')
            .notEmpty().withMessage('Description is required')
            .isString().withMessage('Description must be a string')
            .trim().escape()
            .customSanitizer(value => xss(value)),
        body('released_at')
            .notEmpty().withMessage('Release date is required')
            .isISO8601().withMessage('Invalid date format'),
        body('duration')
            .notEmpty().withMessage('Duration is required')
            .isNumeric().withMessage('Duration must be a number'),
        body('genre')
            .notEmpty().withMessage('Genre is required')
            .isString().withMessage('Genre must be a string')
            .trim().escape()
            .customSanitizer(value => xss(value)),
        body('language')
            .notEmpty().withMessage('Language is required')
            .isString().withMessage('Language must be a string')
            .trim().escape()
            .customSanitizer(value => xss(value)),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map((err) => err.msg);
            return res.status(400).json({
                error: true,
                message: errorMessages[0],
            });
        }

        const { description, released_at, duration, genre, language } = req.body;
        const userId = req.user.id; 

        try {
            // Create a new movie
            const movieRef = await db.collection('movies').add({
                description,
                released_at,
                duration,
                genre,
                language,
                created_by: userId,
                avg_rating: 0, // Default value
                total_rating: 0, // Default value
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            res.status(201).json({
                error: false,
                message: 'Movie created successfully',
                movieId: movieRef.id
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: true,
                message: 'Failed to create movie'
            });
        }
    }
);

// View all movies
movieRouter.get('/all', async (req, res) => {
    try {
        const snapshot = await db.collection('movies').get();

        const movies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            error: false,
            message: 'Movies retrieved successfully',
            movies
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: true,
            message: 'Failed to retrieve movies'
        });
    }
});

// View user's movies
movieRouter.get('/my-movies', async (req, res) => {
    const userId = req.user.id; // Extracted from JWT token by authMiddleware

    try {
        const snapshot = await db.collection('movies').where('created_by', '==', userId).get();

        const myMovies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            error: false,
            message: 'Your movies retrieved successfully',
            movies: myMovies
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: true,
            message: 'Failed to retrieve your movies'
        });
    }
});

// View movie details
movieRouter.get('/:id',
    [
        param('id')
            .notEmpty().withMessage('Movie ID is required')
            .isString().withMessage('ID must be a string')
            .trim().escape()
            .isLength({ max: 20 }).withMessage('ID must be at most 20 characters long')
            .customSanitizer(value => xss(value)),
    ],
    async (req, res) => {
        const { id } = req.params;

        try {
            const movieRef = await db.collection('movies').doc(id).get();

            if (movieRef.empty) {
                return res.status(404).json({
                    error: true,
                    message: 'Movie not found'
                });
            }

            const movie = movieRef.data();

            res.status(200).json({
                error: false,
                message: 'Movie details retrieved successfully',
                movie
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: true,
                message: 'Failed to retrieve movie details'
            });
        }
    }
);

// Update a Movie
movieRouter.put('/update/:id',
    [
        param('id')
            .notEmpty().withMessage('Movie ID is required')
            .customSanitizer(value => xss(value)),
        body('description')
            .optional()
            .isString().withMessage('Description must be a string')
            .trim().escape()
            .customSanitizer(value => xss(value)),
        body('released_at')
            .optional()
            .isISO8601().withMessage('Invalid date format'),
        body('duration')
            .optional()
            .isNumeric().withMessage('Duration must be a number'),
        body('genre')
            .optional()
            .isString().withMessage('Genre must be a string')
            .trim().escape()
            .customSanitizer(value => xss(value)),
        body('language')
            .optional()
            .isString().withMessage('Language must be a string')
            .trim().escape()
            .customSanitizer(value => xss(value)),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map((err) => err.msg);
            return res.status(400).json({
                error: true,
                message: errorMessages[0],
            });
        }

        const { id } = req.params;
        const userId = req.user.id; // Extracted from JWT token
        const updates = req.body;

        try {
            // Get the movie document
            const movieRef = db.collection('movies').doc(id);
            const movieSnapshot = await movieRef.get();

            if (!movieSnapshot.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Movie not found'
                });
            }

            const movie = movieSnapshot.data();

            // Check if the authenticated user is the creator
            if (movie.created_by !== userId) {
                return res.status(403).json({
                    error: true,
                    message: 'You are not authorized to update this movie'
                });
            }

            // Update the movie details and set updated_at
            const updatePayload = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            await movieRef.update(updatePayload);

            res.status(200).json({
                error: false,
                message: 'Movie updated successfully'
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: true,
                message: 'Failed to update movie'
            });
        }
    }
);

// Report a Movie
movieRouter.post('/report/:movieId',
    [
        param('movieId')
            .notEmpty().withMessage('Movie ID is required')
            .customSanitizer(value => xss(value)),
        body('reason')
            .notEmpty().withMessage('Reason is required')
            .isString().withMessage('Reason must be a string')
            .trim().escape()
            .isLength({ min: 5, max: 255 }).withMessage('Reason must be between 5 and 255 characters long')
            .customSanitizer(value => xss(value)),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map((err) => err.msg);
            return res.status(400).json({
                error: true,
                message: errorMessages[0],
            });
        }

        const { movieId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id; // Extracted from JWT token

        try {
            // Check if the movie exists
            const movieRef = db.collection('movies').doc(movieId);
            const movieSnapshot = await movieRef.get();

            if (!movieSnapshot.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Movie not found',
                });
            }

            // Add the report
            await db.collection('reports').add({
                movie_id: movieId,
                user_id: userId,
                reason,
                status: 'pending', // Pending approval
                created_at: new Date().toISOString(),
            });

            res.status(201).json({
                error: false,
                message: 'Movie reported successfully',
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: true,
                message: 'Failed to report the movie',
            });
        }
    }
);

module.exports = movieRouter;
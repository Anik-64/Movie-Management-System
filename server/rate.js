const express = require("express");
const { commonMiddlewares, createRateLimiter } = require("../middleware/commonMiddleware");
const { body, param, validationResult } = require("express-validator");
const admin = require("../config/config");
const xss = require("xss");
const movieRouter = require("./movie");
// const bcrypt = require('bcrypt');

const rateRouter = express.Router();

// Security Middlewares
commonMiddlewares(rateRouter);

// Rate Limiting
const rateRouterLimiter = createRateLimiter();
rateRouter.use(rateRouterLimiter);

const db = admin.firestore();

// Add or Update Rating
rateRouter.post('/:movieId',
    [
        param('movieId')
            .notEmpty().withMessage('Movie ID is required')
            .customSanitizer(value => xss(value)),
        body('rating')
            .notEmpty().withMessage('Rating is required')
            .isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5')
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
        const { rating } = req.body;
        const userId = req.user.id; // Extracted from JWT token

        try {
            // Fetch the movie document
            const movieRef = db.collection('movies').doc(movieId);
            const movieSnapshot = await movieRef.get();

            if (!movieSnapshot.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Movie not found',
                });
            }

            // Check if the user has already rated the movie
            const ratingsRef = db.collection('ratings')
                .where('movie_id', '==', movieId)
                .where('user_id', '==', userId);
            const ratingsSnapshot = await ratingsRef.get();

            if (!ratingsSnapshot.empty) {
                // Update the existing rating
                const ratingDocId = ratingsSnapshot.docs[0].id;
                const ratingRef = db.collection('ratings').doc(ratingDocId);
                await ratingRef.update({ rating: parseInt(rating, 10) });
            } else {
                // Add a new rating
                await db.collection('ratings').add({
                    movie_id: movieId,
                    user_id: userId,
                    rating: parseInt(rating, 10),
                });
            }

            // Recalculate avg_rating and total_rating
            const allRatingsSnapshot = await db.collection('ratings').where('movie_id', '==', movieId).get();
            const totalRatings = allRatingsSnapshot.docs.map(doc => doc.data().rating);
            const avgRating = totalRatings.reduce((sum, r) => sum + r, 0) / totalRatings.length;

            // Update avg_rating and total_rating in the movie document
            await movieRef.update({
                avg_rating: avgRating.toFixed(2), // Keep 2 decimal places
                total_rating: totalRatings.length,
            });

            res.status(200).json({
                error: false,
                message: 'Rating added/updated successfully',
                avg_rating: avgRating.toFixed(2),
                total_rating: totalRatings.length,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: true,
                message: 'Failed to add/update rating',
            });
        }
    }
);

module.exports = rateRouter;
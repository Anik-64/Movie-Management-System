const express = require("express");
const { commonMiddlewares, createRateLimiter } = require("../middleware/commonMiddleware");
const { body, param, validationResult } = require("express-validator");
const admin = require("../config/config");
const xss = require("xss");

const adminRouter = express.Router();

// Security Middlewares
commonMiddlewares(adminRouter);

// Rate Limiting
const adminRouterLimiter = createRateLimiter();
adminRouter.use(adminRouterLimiter);

const db = admin.firestore();

// Admin: Manage a report (Approve/Reject)
adminRouter.post('/manage/:reportId',
    [
        param('reportId')
            .notEmpty().withMessage('Report ID is required')
            .customSanitizer(value => xss(value)),
        body('action')
            .notEmpty().withMessage('Action is required')
            .isString().withMessage('Action must be a string')
            .isIn(['approve', 'reject']).withMessage('Action must be either "approve" or "reject"')
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

        const { reportId } = req.params;
        const { action } = req.body;

        try {
            const reportRef = db.collection('reports').doc(reportId);
            const reportSnapshot = await reportRef.get();

            if (!reportSnapshot.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Report not found',
                });
            }

            const reportData = reportSnapshot.data();

            if (action === 'approve') {
                // Update movie status to 'reported'
                const movieRef = db.collection('movies').doc(reportData.movie_id);
                await movieRef.update({
                    status: 'reported',
                });

                // Update report status to 'approved'
                await reportRef.update({
                    status: 'approved',
                });

                res.status(200).json({
                    error: false,
                    message: 'Report approved successfully',
                });
            } else if (action === 'reject') {
                // Delete the report
                await reportRef.delete();

                res.status(200).json({
                    error: false,
                    message: 'Report rejected and deleted successfully',
                });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: true,
                message: 'Failed to manage the report',
            });
        }
    }
);

// Admin: View all reported movies
adminRouter.get('/', 
    async (req, res) => {
        try {
            const reportsSnapshot = await db.collection('reports').get();

            const reports = reportsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            res.status(200).json({
                error: false,
                reports,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: true,
                message: 'Failed to fetch reports',
            });
        }
    }
);

module.exports = adminRouter;
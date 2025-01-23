// commonMiddleware.js
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Common Middlewares
const commonMiddlewares = (app) => {
    // app.use(
    //     helmet({
    //         contentSecurityPolicy: {
    //             directives: {
    //                 defaultSrc: ["'self'"],
    //                 baseUri: ["'self'"],
    //                 fontSrc: ["'self'", "https:", "data:"],
    //                 formAction: ["'self'"],
    //                 frameAncestors: ["'self'"],
    //                 imgSrc: ["'self'", "data:"],
    //                 objectSrc: ["'none'"],
    //                 scriptSrc: ["'self'"],
    //                 scriptSrcAttr: ["'none'"],
    //                 styleSrc: ["'self'", "https:", "'unsafe-inline'"],
    //                 upgradeInsecureRequests: [],
    //             },
    //         },
    //         referrerPolicy: { policy: 'no-referrer' }, // Protects user privacy by not sending referrer headers
    //         frameguard: { action: 'deny' }, // Prevents clickjacking
    //         hsts: {
    //             maxAge: 31536000, // 1 year
    //             includeSubDomains: true,
    //             preload: true,
    //         }, // Enforces HTTPS
    //         noSniff: true, // Prevents browsers from MIME type sniffing
    //         xssFilter: true, // Adds XSS protection header
    //     })
    // );
    app.use(helmet());
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
};

// Rate Limiting - Can be customized per route
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests, please try again later.") => {
    return rateLimit({
        windowMs,
        max,
        message: message || undefined,
    });
};

module.exports = {
    commonMiddlewares,
    createRateLimiter,
};

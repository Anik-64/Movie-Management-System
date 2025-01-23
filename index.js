// Dependencies
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { authenticateToken, authorizeRoles } = require('./auth/authMiddleware/authMiddleware');
const userRoute = require('./server/movie');
const rateRoute = require('./server/rate');
const reportRoute = require('./server/adminReports');
const authRoute = require('./auth/auth');

require('dotenv').config();

const app = express();
app.use(express.json());

const corsOptions = {
    // origin: (origin, callback) => {
    //   const allowedOrigins = [
    //     'https://localhost:8081',
    //   ];
    //   if (!origin || allowedOrigins.indexOf(origin) !== -1) {
    //     callback(null, true);
    //   } else {
    //     callback(new Error('Not allowed by CORS'));
    //   }
    // },
    origin: '*',
    credentials: true, // If you need to handle cookies or authentication tokens
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    // allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Log file
const logStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
morgan.token('body', (req) => {
    const body = { ...req.body };
    if (body.passphrase) body.passphrase = '*****';
    return JSON.stringify(body);
});

app.use(morgan(':date[iso] :method :url :status :response-time ms - :body', { stream: logStream }));
app.use(morgan('dev'));

// Health Check
app.get('/', (req, res) => {
    try {
        res.status(200).end();
    } catch (err) {
        res.status(503).end();
    }
});

// Auth
app.use('/api/auth', authRoute);

// Routers
app.use('/api/movie', authenticateToken, authorizeRoles(['admin', 'user']), userRoute);
app.use('/api/movie/rate', authenticateToken, authorizeRoles(['admin', 'user']), rateRoute);
app.use('/api/movie/admin/reports', authenticateToken, authorizeRoles(['admin']), reportRoute);

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
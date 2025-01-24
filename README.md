# Movie Management System

This repository contains the code for a secure and user-friendly Movie Management System. The system allows authenticated users to manage movies, rate them, and report inappropriate content, while providing admin controls for report management (Roles - admin & user).

## Features

### User Authentication
- Secure login functionality using email and password.
- Passwords are hashed using `bcrypt` for security.
- JWT-based authentication with access and refresh tokens.

### Movie Management
- Authenticated users can create, view, and update movies.
- Each movie is associated with its creator.
- All users can view movies created by others.

### Movie Rating
- Users can rate movies on a scale of 1 to 5.
- Users can modify their ratings.
- Average ratings are calculated dynamically and displayed for each movie.
- Updating ratings does not modify the movie's `updated_at` timestamp.

### Reporting Movies
- Users can report inappropriate movies.
- Admins can view, approve, or reject reports.
- Approved reports mark movies as "reported," while rejected reports are deleted.

## Technologies Used

### Backend
- **Node.js** with **Express.js** for the server.
- **Firebase Firestore** for the database.
- **Firebase Admin SDK** for database interactions.

### Middleware and Utilities
- `express` - Web framework for Node.js.
- `body-parser` - Parses incoming request bodies.
- `helmet` - Secures HTTP headers.
- `express-rate-limit` - Limits repeated requests to APIs.
- `xss` - Sanitizes user input to prevent XSS attacks.
- `express-validator` - Validates and sanitizes request data.
- `cookie-parser` - Parses cookies.
- `bcrypt` - Hashes passwords.
- `jsonwebtoken` - Manages authentication tokens.
- `dotenv` - Loads environment variables.
- `morgan` - Logs HTTP requests.
- `cors` - Handles Cross-Origin Resource Sharing.
- `firebase-admin` - Interacts with Firebase services.

## Project Structure
```
├── auth
│   ├── authMiddleware
│   │   └── authMiddleware.js
│   ├── auth.js
├── config
│   ├── config.js
│   ├── firebaseKey.json
├── middleware
│   ├── commonMiddleware.js
├── server
│   ├── movie.js
│   ├── rate.js
│   ├── adminReports.js
├── .env
├── access.log
├── index.js
├── package.json
└── README.md
```

## API Endpoints

Here, you can find all service API [Postman](https://documenter.getpostman.com/view/33257219/2sAYQdkW7i)
<img align="right" src="https://wso2.cachefly.net/wso2/sites/all/2021-theme/apim-2021/apim4-animations/apim-page-animation-get-business-insights-and-intelligence-through-APIs.gif">

### Authentication
- `POST /api/auth/register` - Register a new user.
- `POST /api/auth/login/emailpassword` - Log in with email and password.
- `POST /api/auth/login/usernamepassword` - Log in with username and password.

### Movies
- `GET /api/movie/all` - Get all movies.
- `GET /api/movie/my-movies` - Get my movies (Associated with user).
- `GET /api/movie/:id` - Get a specific movie's details.
- `POST /api/movie/create` - Create a new movie.
- `PUT /api/movie/update/:id` - Update a movie (creator only).
- `POST /api/movie/report/:Id` - Report a movie.

### Ratings
- `POST /api/movie/rate/:Id` - Rate a movie (Add and Update).

### Manage Reports (Admin)
- `GET /api/movie/admin/reports` - Get all reported movies.
- `POST /api/movie/admin/reports/manage/:reportId` - Admin: Approve/Reject a report.

## Logging
HTTP requests are logged in `access.log` with sensitive data masked.

## Security Features
- Password hashing with `bcrypt`.
- Input sanitization with `xss` and `express-validator`.
- HTTP header protection with `helmet`.
- Rate limiting to prevent brute-force attacks.

## Contributions
Feel free to submit issues or pull requests to improve this project. Make sure to follow the contribution guidelines.

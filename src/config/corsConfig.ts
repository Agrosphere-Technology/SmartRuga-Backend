import cors from 'cors';

/**
 * Read allowed origins from env
 * Example:
 * CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
 */

const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

export const configureCors = () => {
    return cors({
        origin: (origin, callback) => {
            // Allow server-to-server / Postman / curl (no origin)
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked: ${origin}`), false);
        },

        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept-Version',
            'X-Requested-With',
        ],

        exposedHeaders: [
            'X-Total-Count',
            'Content-Range',
        ],

        credentials: true,

        preflightContinue: false,
        maxAge: 600,
        optionsSuccessStatus: 204,
    });
};
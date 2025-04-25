import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow frontend origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));  // Use cors with specified config
app.use(express.json());

// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Routes
app.use('/api', routes);

// Test endpoint
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello from the Travel Planner AI backend!' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Something went wrong!',
        message: err.message 
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

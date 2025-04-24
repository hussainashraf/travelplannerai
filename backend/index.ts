import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors());  // Use cors with default config for development
app.use(express.json());

// Routes
app.use('/api', routes);

// Test endpoint
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello from the Travel Planner AI backend!' });
});

// Error handling
app.use((err: Error, req: Request, res: Response) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

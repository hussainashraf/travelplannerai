import express, { Request, Response, NextFunction } from 'express';
import { generateTripPlan } from '../aiengine';

const router = express.Router();

interface TripPlanRequest {
    origin?: {
        name: string;
        coordinates: {
            lat: string;
            lon: string;
        }
    };
    destination: string;
    startDate: string;
    endDate: string;
    budget: string;
    vacationType: string;
    transportMode: string;
    numberOfDays: number;
    coordinates: {
        lat: string;
        lon: string;
    };
}

// Generate trip plan
router.post('/generate-plan', async (req: Request<{}, {}, TripPlanRequest>, res: Response, next: NextFunction) => {
    try {
        const tripData = req.body;

        // Validate required fields
        if (!tripData.destination || !tripData.startDate || !tripData.endDate || !tripData.budget || 
            !tripData.vacationType || !tripData.numberOfDays || !tripData.coordinates) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Generate AI trip plan
        const aiResponse = await generateTripPlan(tripData);

        if (!aiResponse) {
            throw new Error('Failed to generate trip plan');
        }

        res.json({
            success: true,
            plan: aiResponse.plan
        });
    } catch (error) {
        next(error); // Forward error to error handling middleware
    }
});

// Get saved plans
router.get('/saved-plans', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // TODO: Implement database fetch logic
        res.json({
            success: true,
            plans: []
        });
    } catch (error) {
        next(error);
    }
});

// Save a plan
router.post('/save-plan', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const planData = req.body;
        // TODO: Implement database save logic
        res.json({
            success: true,
            message: 'Plan saved successfully'
        });
    } catch (error) {
        next(error);
    }
});

export default router;

import express, { Request, Response } from 'express';
import { generateTripPlan } from '../aiengine';

const router = express.Router();

interface TripPlanRequest {
    destination: string;
    startDate: string;
    endDate: string;
    budget: string;
    vacationType: string;
    numberOfDays: number;
    coordinates: {
        lat: string;
        lon: string;
    };
}

// Generate trip plan
router.post('/generate-plan', async (req: Request<{}, {}, TripPlanRequest>, res: Response) => {
    try {
        const tripData = req.body;

        // Generate AI trip plan
        const aiResponse = await generateTripPlan(tripData);

        res.json({
            success: true,
            plan: aiResponse.plan
        });
    } catch (error) {
        console.error('Error generating trip plan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate trip plan'
        });
    }
});

// Get saved plans
router.get('/saved-plans', async (req: Request, res: Response) => {
    try {
        // TODO: Implement database fetch logic
        res.json({
            success: true,
            plans: []
        });
    } catch (error) {
        console.error('Error fetching saved plans:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch saved plans'
        });
    }
});

// Save a plan
router.post('/save-plan', async (req: Request, res: Response) => {
    try {
        const planData = req.body;
        // TODO: Implement database save logic
        res.json({
            success: true,
            message: 'Plan saved successfully'
        });
    } catch (error) {
        console.error('Error saving plan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save plan'
        });
    }
});

export default router;

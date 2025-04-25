import express, { Request, Response, NextFunction } from 'express';
import { generateTripPlan, fetchFlights, fetchHotels, systemPrompt } from '../aiengine';
import cors from 'cors';
import { OpenAI } from 'openai';

const router = express.Router();

// Enable CORS for all routes


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

interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'function';
    content: string;
    name?: string;
}

interface ChatRequest {
    message: string;
    chatHistory: ChatMessage[];
}

// Function definitions for OpenAI
const functions = [
    {
        name: 'fetch_flights',
        description: 'Fetch flight information between locations for given dates',
        parameters: {
            type: 'object',
            properties: {
                origin: {
                    type: 'string',
                    description: 'Origin city/location'
                },
                destination: {
                    type: 'string',
                    description: 'Destination city/location'
                },
                departureDate: {
                    type: 'string',
                    description: 'Departure date in YYYY-MM-DD format'
                },
                adults: {
                    type: 'string',
                    description: 'Number of adult passengers'
                },
                children: {
                    type: 'string',
                    description: 'Number of child passengers'
                },
                infants: {
                    type: 'string',
                    description: 'Number of infant passengers'
                },
                cabinClass: {
                    type: 'string',
                    description: 'Cabin class (Economy, Business, First, Premium_Economy)'
                }
            },
            required: ['origin', 'destination', 'departureDate']
        }
    },
    {
        name: 'fetch_hotels',
        description: 'Fetch hotel recommendations for the destination',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'Destination city/location'
                },
                checkIn: {
                    type: 'string',
                    description: 'Check-in date in YYYY-MM-DD format'
                },
                checkOut: {
                    type: 'string',
                    description: 'Check-out date in YYYY-MM-DD format'
                },
                budget: {
                    type: 'string',
                    description: 'Budget range for hotels'
                },
                preferences: {
                    type: 'string',
                    description: 'Additional preferences like "beachfront", "city center", etc.'
                }
            },
            required: ['location', 'checkIn', 'checkOut']
        }
    }
];

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

// Chat endpoint
router.post('/chat', async (req: Request<{}, {}, ChatRequest>, res: Response, next: NextFunction) => {
    try {
        const { message, chatHistory } = req.body;

        // Validate required fields
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: message }
        ];

        // Initialize OpenAI
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        let finalResponse = '';
        let flightData = null;
        let hotelData = null;

        // Initial API call with function calling enabled
        while (true) {
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages as any,
                functions: functions,
                function_call: "auto",
                temperature: 0.7,
            });

            const responseMessage = response.choices[0].message;

            // If no function call is needed, we have our final response
            if (!responseMessage.function_call) {
                finalResponse = responseMessage.content || '';
                break;
            }

            // Handle function calls
            const functionName = responseMessage.function_call.name;
            const functionArgs = JSON.parse(responseMessage.function_call.arguments);
            
            let functionResult;
            if (functionName === 'fetch_flights') {
                functionResult = await fetchFlights(functionArgs);
                flightData = functionResult;
            } else if (functionName === 'fetch_hotels') {
                functionResult = await fetchHotels(functionArgs);
                hotelData = functionResult;
            }

            // Add the assistant's message and function result to the conversation
            messages.push(responseMessage as any);
            messages.push({
                role: 'function',
                name: functionName,
                content: JSON.stringify(functionResult)
            });
        }

        res.json({
            success: true,
            response: finalResponse,
            flights: flightData?.flights || [],
            hotels: hotelData?.hotels || []
        });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        next(error);
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

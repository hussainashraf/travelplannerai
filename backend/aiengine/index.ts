import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import { indianAirports } from './airports';
import { hotelData } from './hotel-data';
import {
    HotelResponse,
    Hotel,
    HotelDataType,
    FlightParams,
    HotelParams,
    TripData,
    FlightInfo,
    HotelInfo,
    TripPlanResponse
} from './types';
    
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const FLIGHT_API_KEY = '68092ec2bbaf5dda8cbde0b2';
const MAKCORPS_API_KEY = '68091ec2e40ecf4738ae291c';

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

// Function to get airport code from city name
function getAirportCode(cityName: string | null | undefined | { name: string }): string {
    if (!cityName) {
        return 'DEL'; // Default to Delhi if no city is provided
    }

    // Handle object format from location picker
    let cityString: string;
    if (typeof cityName === 'object' && 'name' in cityName && cityName.name) {
        cityString = cityName.name;
    } else if (typeof cityName === 'string') {
        cityString = cityName;
    } else {
        return 'DEL'; // Default to Delhi for invalid input
    }

    // Remove country names and clean up the city name
    const cleanCityName = cityString
        .replace(/, India/i, '')
        .replace(/,.*$/, '')
        .trim();

    const normalizedCity = cleanCityName.toLowerCase();
    return indianAirports[normalizedCity] || cleanCityName.toUpperCase();
}

// Function to format date to YYYY-MM-DD
function formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

async function fetchFlights(params: FlightParams): Promise<FlightInfo> {
    try {
        console.log('Fetching flights with params:', params);

        // Validate input parameters
        if (!params.origin || !params.destination || !params.departureDate) {
            throw new Error('Missing required parameters: origin, destination, or departureDate');
        }

        // Convert city names to airport codes and clean up the format
        const originCode = getAirportCode(params.origin);
        const destinationCode = getAirportCode(params.destination);

        // Format the date properly
        const formattedDate = formatDate(params.departureDate);

        // Default values for optional parameters
        const adults = params.adults || '1';
        const children = params.children || '0';
        const infants = params.infants || '0';
        const cabinClass = (params.cabinClass || 'Economy').charAt(0).toUpperCase() + (params.cabinClass || 'Economy').slice(1).toLowerCase();

        // Construct the API URL with proper formatting
        const apiUrl = `https://api.flightapi.io/onewaytrip/${FLIGHT_API_KEY}/${originCode}/${destinationCode}/${formattedDate}/${adults}/${children}/${infants}/${cabinClass}/INR`;

        console.log('Making API request to:', apiUrl);

        const response = await axios.get(apiUrl);
        
        // Transform the API response into our standard format
        const flights = response.data.itineraries.map((itinerary: any) => {
            const leg = response.data.legs.find((l: any) => l.id === itinerary.leg_ids[0]);
            const segment = response.data.segments.find((s: any) => s.id === leg.segment_ids[0]);
            const price = itinerary.pricing_options[0]?.price?.amount || 'N/A';
            
            return {
                airline: segment?.marketing_carrier_id.toString() || 'Unknown Airline',
                flight_number: segment?.marketing_flight_number || 'N/A',
                price: {
                    amount: price,
                    currency: 'INR'
                },
                departure: {
                    time: leg?.departure || 'N/A',
                    airport: originCode
                },
                arrival: {
                    time: leg?.arrival || 'N/A',
                    airport: destinationCode
                },
                duration: leg?.duration || 'N/A',
                stops: leg?.stop_count || 0
            };
        });

        return {
            flights,
            source: "FlightAPI.io",
            total: flights.length,
            message: flights.length > 0 ? "Flights found successfully" : "No flights found for this route"
        };

    } catch (error: any) {
        console.error('Error fetching flights:', error.message);
        
        // Fallback to static data if API fails
        try {
            const staticData = require('./flight-routes.json');
            const route = staticData.routes.find(
                (r: any) => 
                    r.originCode === getAirportCode(params.origin) && 
                    r.destinationCode === getAirportCode(params.destination)
            );

            if (route) {
                return {
                    flights: route.airlines,
                    source: "Static Data (API Fallback)",
                    total: route.airlines.length,
                    message: "Using fallback data due to API error"
                };
            }
        } catch (fallbackError) {
            console.error('Error using fallback data:', fallbackError);
        }

        return {
            flights: [],
            source: "FlightAPI.io",
            error: error.response?.data?.message || error.message,
            total: 0,
            message: "Error fetching flight data"
        };
    }
}

async function getCityId(cityName: string): Promise<string | null> {
    try {
        // Clean up the city name
        const cleanCityName = cityName
            .replace(/, India/i, '')
            .replace(/,.*/g, '')
            .trim();

        const response = await axios.get('https://api.makcorps.com/mapping', {
            params: {
                api_key: MAKCORPS_API_KEY,
                name: cleanCityName
            }
        });

        if (response.data && Array.isArray(response.data)) {
            // First try to find a GEO type result
            const geoResult = response.data.find(item => item.type === 'GEO');
            if (geoResult) {
                return geoResult.document_id;
            }

            // If no GEO type, try to find a HOTEL type and use its parent_id
            const hotelResult = response.data.find(item => item.type === 'HOTEL');
            if (hotelResult?.details?.parent_id) {
                return hotelResult.details.parent_id.toString();
            }
        }

        console.log('No matching city found for:', cleanCityName);
        return null;
    } catch (error) {
        console.error('Error fetching city ID:', error);
        return null;
    }
}

async function fetchHotels(params: HotelParams): Promise<HotelInfo> {
    try {
        console.log('Fetching hotels with params:', params);

        // Clean up the location name
        const location = params.location
            .toLowerCase()
            .replace(/, india/i, '')
            .replace(/,.*/g, '')
            .trim();

        // Find matching city data
        const cityData = (hotelData as HotelDataType)[location];
        if (!cityData) {
            throw new Error('No hotels found for this location');
        }

        // Filter hotels based on budget if provided
        let maxPrice = Infinity;
        if (params.budget) {
            const budgetMatch = params.budget.match(/₹(\d+,)*\d+/g);
            if (budgetMatch && budgetMatch.length > 0) {
                const highestAmount = budgetMatch[budgetMatch.length - 1]
                    .replace('₹', '')
                    .replace(/,/g, '');
                maxPrice = parseInt(highestAmount);
            }
        }

        const filteredHotels = cityData.hotels.filter((hotel: Hotel) => {
            const hotelPrice = parseInt(hotel.price.replace(/[₹,]/g, ''));
            return hotelPrice <= maxPrice;
        });

        return {
            hotels: filteredHotels,
            total: filteredHotels.length,
            cityId: cityData.cityId,
            message: filteredHotels.length > 0 ? "Hotels found successfully" : "No hotels found within budget"
        };

    } catch (error: any) {
        console.error('Error fetching hotels:', error);
        return {
            hotels: [],
            total: 0,
            cityId: '',
            message: error.message || "Error fetching hotel data",
            error: error.message
        };
    }
}

const systemPrompt = `You are an expert travel planner with deep knowledge of destinations worldwide. 
Your task is to create detailed, personalized travel itineraries based on user preferences.

To gather necessary information:
1. Use the fetch_flights function to find available flights based on the user's requirements
2. Use the fetch_hotels function to find suitable accommodations within the user's budget

When creating the plan:
- Analyze flight options for the best balance of price, timing, and convenience
- Select hotels that match the budget and preferences
- Create a detailed day-by-day itinerary
- Provide a comprehensive budget breakdown

Format the final itinerary using markdown with clear sections:
# 🛫 Flight Details
# 🏨 Accommodation
# 📅 Daily Itinerary
# 💰 Budget Breakdown
# 🗺️ Travel Tips

Use emojis and markdown formatting to make the plan engaging and easy to read.`;

export async function generateTripPlan(tripData: TripData): Promise<TripPlanResponse> {
    try {
        const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: `Please create a travel plan for a ${tripData.numberOfDays}-day trip from ${tripData.origin?.name || tripData.source} to ${tripData.destination}.
                
                Trip Details:
                - Budget: ${tripData.budget}
                - Vacation Type: ${tripData.vacationType}
                - Dates: ${tripData.startDate} to ${tripData.endDate}
                
                Please start by checking available flights and hotels, then create a comprehensive travel plan.
                
                Additional Preferences:
                - Preferred activities: ${tripData.preferences || 'Not specified'}
                - Special requirements: ${tripData.requirements || 'None'}`
            }
        ];

        let finalPlan = '';
        let flightData: FlightInfo | null = null;
        let hotelData: HotelInfo | null = null;

        // Initial API call with function calling enabled
        while (true) {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: messages,
                functions: functions,
                function_call: "auto",
                temperature: 0.1,
            });

            const responseMessage = response.choices[0].message;

            // If no function call is needed, we have our final response
            if (!responseMessage.function_call) {
                finalPlan = responseMessage.content || '';
                break;
            }

            // Handle function calls
            const functionName = responseMessage.function_call.name;
            const functionArgs = JSON.parse(responseMessage.function_call.arguments);
            
            let functionResult;
            if (functionName === 'fetch_flights') {
                // Prepare flight parameters
                const flightParams: FlightParams = {
                    origin: tripData.origin?.name || tripData.source || '',
                    destination: tripData.destination,
                    departureDate: tripData.startDate,
                    ...functionArgs
                };
                functionResult = await fetchFlights(flightParams);
                flightData = functionResult;
            } else if (functionName === 'fetch_hotels') {
                // Prepare hotel parameters
                const hotelParams: HotelParams = {
                    location: tripData.destination,
                    checkIn: tripData.startDate,
                    checkOut: tripData.endDate,
                    budget: tripData.budget,
                    ...functionArgs
                };
                functionResult = await fetchHotels(hotelParams);
                hotelData = functionResult;
            }

            // Add the assistant's message and function result to the conversation
            messages.push(responseMessage);
            messages.push({
                role: "function",
                name: functionName,
                content: JSON.stringify(functionResult)
            });
        }

        return {
            success: true,
            plan: finalPlan,
            flights: flightData?.flights || [],
            hotels: hotelData?.hotels || []
        };

    } catch (error) {
        console.error('Error in AI processing:', error);
        throw error;
    }
}

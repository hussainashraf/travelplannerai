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

// Add fallback flight data
const getFallbackFlights = (origin: string, destination: string, departureDate: string) => {
    const airlines = ['IndiGo', 'Air India', 'SpiceJet', 'Vistara'];
    const randomPrice = Math.floor(Math.random() * (15000 - 3000 + 1)) + 3000;
    const randomDuration = Math.floor(Math.random() * (240 - 60 + 1)) + 60; // Duration in minutes
    const departureTime = new Date(departureDate);
    departureTime.setHours(Math.floor(Math.random() * 24));
    
    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + randomDuration);

    const randomAirline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNumber = `${randomAirline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`;

    return [{
        airline: randomAirline,
        flight_number: flightNumber,
        price: {
            amount: randomPrice.toFixed(2),
            currency: 'INR'
        },
        departure: {
            time: departureTime.toISOString(),
            airport: getAirportCode(origin)
        },
        arrival: {
            time: arrivalTime.toISOString(),
            airport: getAirportCode(destination)
        },
        duration: `${Math.floor(randomDuration / 60)}h ${randomDuration % 60}m`,
        stops: 0
    }];
};

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

        if (flights.length === 0) {
            console.log('No flights found, using fallback data');
            const fallbackFlights = getFallbackFlights(params.origin, params.destination, params.departureDate);
            return {
                flights: fallbackFlights,
                source: "Fallback Data",
                total: fallbackFlights.length,
                message: "Using fallback flight data as no real flights were found"
            };
        }

        return {
            flights,
            source: "FlightAPI.io",
            total: flights.length,
            message: flights.length > 0 ? "Flights found successfully" : "No flights found for this route"
        };

    } catch (error: any) {
        console.error('Error fetching flights:', error.message);
        
        console.log('API failed, using fallback data');
        const fallbackFlights = getFallbackFlights(params.origin, params.destination, params.departureDate);
        return {
            flights: fallbackFlights,
            source: "Fallback Data",
            total: fallbackFlights.length,
            message: "Using fallback data due to API error"
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

const systemPrompt = `You are an expert travel planner with deep knowledge of destinations in India. 
Your task is to create beautifully formatted, engaging travel itineraries that are easy to read.

IMPORTANT: First carefully analyze the user's query to extract and understand:
1. Origin location (where they're traveling from)
2. Destination(s) (where they want to go)
3. Trip duration (how many days)
4. Specific dates mentioned (actual calendar dates)
5. Specific attractions or landmarks they want to visit
6. Budget constraints or preferences
7. Type of vacation they're seeking

If the user provides specific information like "Give me a 7-day trip to Rajasthan starting from Jaipur" or "Include a visit to Hawa Mahal" or "travel date should be April 30, 2025", make sure to incorporate these details exactly as requested in your plan.

To gather necessary information:
1. ONLY use the fetch_flights function if BOTH a specific origin AND destination city are provided. If only a destination is mentioned or the origin is unclear, focus on local transportation options instead.
2. Use the fetch_hotels function to find suitable accommodations for each location in the itinerary.

When creating the plan:
- Only include flight options when both origin and destination cities are clearly specified
- For trips without specified origin cities, focus on local transportation and sightseeing within the destination
- Select hotels that match the budget and preferences
- Create a detailed day-by-day itinerary that includes all requested attractions
- Arrange multi-city trips logically to minimize travel time between destinations
- Provide a comprehensive budget breakdown with realistic estimates
- Include local transportation options between attractions

FORMAT YOUR RESPONSE WITH THESE STYLING GUIDELINES:
1. Use clean, elegant formatting with plenty of whitespace
2. Create visual separation between sections
3. Use bullet points for lists rather than dense paragraphs
4. Highlight important information like hotel names and attractions
5. Keep paragraphs short and focused - 2-3 sentences maximum
6. Use headings and subheadings to organize information
7. Incorporate emojis sparingly to add visual interest

Structure your response with these clear sections:

## ✈️ Travel Information
[Include flight details ONLY if origin and destination are both specified, otherwise focus on local transportation options]

## 🏨 Accommodations
[List accommodations by location with brief descriptions]

## 📅 Itinerary Overview
[Brief day-by-day summary with locations]

## 📍 Daily Plans
[Detailed daily itineraries with attractions and timings]

## 💰 Budget Breakdown 
[Categorized expense estimates]

## 🔎 Travel Tips
[3-5 specific tips relevant to the destinations]

Remember to prioritize clarity and visual appeal in your response. Make the itinerary easy to scan and understand at a glance.`;

async function generateTripPlan(tripData: TripData): Promise<TripPlanResponse> {
    try {
        // Check if both origin and destination are provided
        const hasOriginAndDestination = !!(tripData.origin?.name || tripData.source) && !!tripData.destination;

        const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: `Please create a travel plan for a ${tripData.numberOfDays}-day trip ${hasOriginAndDestination ? `from ${tripData.origin?.name || tripData.source} to ${tripData.destination}` : `to ${tripData.destination}`}.
                
                Trip Details:
                - Budget: ${tripData.budget}
                - Vacation Type: ${tripData.vacationType}
                - Dates: ${tripData.startDate} to ${tripData.endDate}
                
                Please ${hasOriginAndDestination ? 'start by checking available flights and hotels' : 'suggest appropriate accommodation and local transportation options'}, then create a comprehensive travel plan.
                
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
                model: "gpt-4o",
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
                // Only fetch flights if both origin and destination are provided
                if (hasOriginAndDestination) {
                    // Prepare flight parameters
                    const flightParams: FlightParams = {
                        origin: tripData.origin?.name || tripData.source || '',
                        destination: tripData.destination,
                        departureDate: tripData.startDate,
                        ...functionArgs
                    };
                    functionResult = await fetchFlights(flightParams);
                    flightData = functionResult;
                } else {
                    // Return empty flight data if origin is not provided
                    functionResult = {
                        flights: [],
                        source: "No Data",
                        total: 0,
                        message: "Flight information requires both origin and destination"
                    };
                }
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

// Export the systemPrompt along with other exports
export { generateTripPlan, fetchFlights, fetchHotels, systemPrompt };

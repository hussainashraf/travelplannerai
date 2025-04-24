export interface HotelResponse {
    name?: string;
    price?: number;
    rating?: number;
    address?: string;
    location?: string;
    amenities?: string[];
    image_url?: string;
    photo?: string;
    description?: string;
    latitude?: number;
    lat?: number;
    longitude?: number;
    lng?: number;
    id?: string;
    room_types?: any[];
}

export interface Hotel {
    name: string;
    price: string;
    rating: number;
    location: string;
    amenities: string[];
    image: string;
    description: string;
    coordinates: {
        lat: number;
        lon: number;
    };
}

export interface CityData {
    cityId: string;
    hotels: Hotel[];
}

export interface HotelDataType {
    [key: string]: CityData;
}

export interface FlightParams {
    origin: string;
    destination: string;
    departureDate: string;
    adults?: string;
    children?: string;
    infants?: string;
    cabinClass?: string;
}

export interface HotelParams {
    location: string;
    checkIn: string;
    checkOut: string;
    budget?: string;
    preferences?: string;
}

export interface Coordinates {
    lat: string;
    lon: string;
}

export interface Origin {
    name: string;
    coordinates: Coordinates;
}

export interface TripData {
    origin?: Origin;
    source?: string;
    destination: string;
    startDate: string;
    endDate: string;
    budget: string;
    vacationType: string;
    transportMode: string;
    numberOfDays: number;
    coordinates: Coordinates;
    preferences?: string;
    requirements?: string;
}

export interface FlightInfo {
    flights: any[];
    source: string;
    total: number;
    message: string;
    error?: string;
}

export interface HotelInfo {
    hotels: Hotel[];
    total: number;
    cityId: string;
    message: string;
    error?: string;
}

export interface TripPlanResponse {
    success: boolean;
    plan: string;
    flights: any[];
    hotels: Hotel[];
} 
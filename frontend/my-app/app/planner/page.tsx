'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

interface Place {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    country_code?: string;
  };
}

interface TripPlan {
  success: boolean;
  plan: string;
}

export default function PlannerPage() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [originSearchQuery, setOriginSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [originSuggestions, setOriginSuggestions] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOriginLoading, setIsOriginLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [vacationType, setVacationType] = useState<string>("");
  const [transportMode, setTransportMode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  // Get today's date at midnight for consistent comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Function to calculate minimum end date based on start date and selected days
  const calculateMinEndDate = useCallback(() => {
    if (!startDate || !selectedDays) return undefined;
    const minEndDate = new Date(startDate);
    minEndDate.setDate(minEndDate.getDate() + parseInt(selectedDays) - 1);
    return minEndDate;
  }, [startDate, selectedDays]);

  // Function to check if a date should be disabled in the end date calendar
  const isEndDateDisabled = (date: Date): boolean => {
    if (!startDate) return true;
    const minEndDate = calculateMinEndDate();
    return date < today || date < startDate || (minEndDate ? date < minEndDate : false);
  };

  useEffect(() => {
    if (startDate && selectedDays) {
      const minEndDate = calculateMinEndDate();
      // Only auto-set end date if it's not already set or if it's before the minimum end date
      if (!endDate || (minEndDate && endDate < minEndDate)) {
        setEndDate(minEndDate);
      }
    }
  }, [startDate, selectedDays, endDate, calculateMinEndDate]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
      setIsLoading(false);
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const fetchOriginSuggestions = async () => {
      if (originSearchQuery.length < 3) {
        setOriginSuggestions([]);
        return;
      }

      setIsOriginLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            originSearchQuery
          )}&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setOriginSuggestions(data);
      } catch (error) {
        console.error('Error fetching origin suggestions:', error);
      }
      setIsOriginLoading(false);
    };

    const timeoutId = setTimeout(fetchOriginSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [originSearchQuery]);

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    setSearchQuery(place.display_name);
    setSuggestions([]);
  };

  const handleOriginSelect = (place: Place) => {
    setSelectedOrigin(place);
    setOriginSearchQuery(place.display_name);
    setOriginSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!selectedPlace || !selectedOrigin || !startDate || !endDate || !selectedDays || !budget || !vacationType || !transportMode) {
      alert("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setShowPlan(false);
    try {
      const response = await fetch('http://54.90.71.92:3001/api/planner/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: {
            name: selectedOrigin.display_name,
            coordinates: {
              lat: selectedOrigin.lat,
              lon: selectedOrigin.lon
            }
          },
          destination: selectedPlace.display_name,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          budget,
          vacationType,
          transportMode,
          numberOfDays: parseInt(selectedDays),
          coordinates: {
            lat: selectedPlace.lat,
            lon: selectedPlace.lon
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setTripPlan(data);
      setShowPlan(true);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to generate trip plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50">
      <nav className="fixed top-0 left-0 right-0 px-6 py-4 bg-white/80 backdrop-blur-sm z-50 border-b border-gray-100">
        <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </Link>
      </nav>

      <div className="flex min-h-screen pt-16">
        {/* Left Side - Form */}
        <div className="w-full lg:w-[600px] xl:w-[650px] p-6 border-r border-gray-200 bg-white/50 overflow-y-auto">
          <Card className="border-none shadow-lg sticky top-20">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-gray-800">Plan Your Dream Trip</CardTitle>
              <CardDescription className="text-base text-gray-600 mt-2">
                Let AI create your perfect travel itinerary
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Origin Search */}
              <div className="space-y-2 relative">
                <Label htmlFor="origin" className="text-gray-600">Where are you traveling from?</Label>
                <div className="relative">
                  <Input
                    type="text"
                    id="origin"
                    value={originSearchQuery}
                    onChange={(e) => setOriginSearchQuery(e.target.value)}
                    placeholder="Search for your departure city..."
                    className="w-full text-gray-700 placeholder:text-gray-400"
                  />
                  {isOriginLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                {originSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white rounded-md shadow-lg border border-gray-200 mt-1">
                    {originSuggestions.map((place) => (
                      <button
                        key={place.place_id}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm flex items-center gap-2"
                        onClick={() => handleOriginSelect(place)}
                      >
                        {place.address?.country_code && (
                          <img 
                            src={`https://flagcdn.com/24x18/${place.address.country_code.toLowerCase()}.png`}
                            alt={`${place.address.country_code} flag`}
                            className="w-6 h-4 object-cover rounded"
                            loading="lazy"
                          />
                        )}
                        <span>{place.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Search */}
              <div className="space-y-2 relative">
                <Label htmlFor="destination" className="text-gray-600">Where would you like to go?</Label>
                <div className="relative">
                  <Input
                    type="text"
                    id="destination"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for cities, countries, or regions..."
                    className="w-full text-gray-700 placeholder:text-gray-400"
                  />
                  {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white rounded-md shadow-lg border border-gray-200 mt-1">
                    {suggestions.map((place) => (
                      <button
                        key={place.place_id}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm flex items-center gap-2"
                        onClick={() => handlePlaceSelect(place)}
                      >
                        {place.address?.country_code && (
                          <img 
                            src={`https://flagcdn.com/24x18/${place.address.country_code.toLowerCase()}.png`}
                            alt={`${place.address.country_code} flag`}
                            className="w-6 h-4 object-cover rounded"
                            loading="lazy"
                          />
                        )}
                        <span>{place.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Number of Days */}
              <div className="space-y-2">
                <Label htmlFor="days" className="text-gray-600">Duration of Stay</Label>
                <Select value={selectedDays} onValueChange={setSelectedDays}>
                  <SelectTrigger className="w-full text-gray-700 bg-white">
                    <SelectValue placeholder="Select number of days" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(7)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1} {i + 1 === 1 ? 'day' : 'days'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transport Mode Selection */}
              <div className="space-y-2">
                <Label htmlFor="transportMode" className="text-gray-600">Preferred Mode of Transport</Label>
                <Select value={transportMode} onValueChange={setTransportMode}>
                  <SelectTrigger className="w-full text-gray-700 bg-white">
                    <SelectValue placeholder="How would you like to travel?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">Flight</SelectItem>
                    <SelectItem value="mixed">Mixed (Multiple modes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Budget Selection */}
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-gray-600">Budget (INR)</Label>
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger className="w-full text-gray-700 bg-white">
                    <SelectValue placeholder="Select your budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="₹10,000 - ₹25,000">₹10,000 - ₹25,000</SelectItem>
                    <SelectItem value="₹25,000 - ₹50,000">₹25,000 - ₹50,000</SelectItem>
                    <SelectItem value="₹50,000 - ₹1,00,000">₹50,000 - ₹1,00,000</SelectItem>
                    <SelectItem value="₹1,00,000+">₹1,00,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-600">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white",
                          !startDate && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => date < today}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-600">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white",
                          !endDate && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={isEndDateDisabled}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Vacation Type */}
              <div className="space-y-2">
                <Label htmlFor="vacationType" className="text-gray-600">Type of Vacation</Label>
                <Select value={vacationType} onValueChange={setVacationType}>
                  <SelectTrigger className="w-full text-gray-700 bg-white">
                    <SelectValue placeholder="Select your vacation style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="relaxation">Relaxation</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="foodie">Foodie</SelectItem>
                    <SelectItem value="nature">Nature & Wildlife</SelectItem>
                    <SelectItem value="urban">Urban Exploration</SelectItem>
                    <SelectItem value="beach">Beach & Coastal</SelectItem>
                    <SelectItem value="luxury">Luxury & Spa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-[#0B4619] hover:bg-[#0B4619]/90 text-white py-6 text-lg font-normal relative"
              >
                {isSubmitting ? (
                  <>
                    <span className="opacity-0">Plan My Trip</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </>
                ) : (
                  'Plan My Trip'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Results */}
        <div className="hidden lg:block flex-1 p-6 overflow-y-auto bg-gray-50">
          {showPlan && tripPlan ? (
            <div className="max-w-4xl mx-auto">
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-[#0B4619] text-white p-8 rounded-t-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">🎯</span>
                    <CardTitle className="text-3xl font-bold">Your Travel Plan</CardTitle>
                  </div>
                  <CardDescription className="text-gray-100 text-lg">
                    Here&apos;s your AI-crafted travel itinerary for {selectedPlace?.display_name.split(',')[0]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-0">
                    {/* Trip Summary */}
                    <div className="border-b border-gray-200 bg-white p-8">
                      <h3 className="text-2xl font-semibold flex items-center gap-3 mb-6">
                        <span className="text-2xl">✈️</span>
                        <span>Trip Overview</span>
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
                          <div className="text-sm font-medium text-gray-500 mb-2">From</div>
                          <div className="text-lg font-semibold text-gray-900">{selectedOrigin?.display_name.split(',')[0]}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
                          <div className="text-sm font-medium text-gray-500 mb-2">To</div>
                          <div className="text-lg font-semibold text-gray-900">{selectedPlace?.display_name.split(',')[0]}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
                          <div className="text-sm font-medium text-gray-500 mb-2">Duration</div>
                          <div className="text-lg font-semibold text-gray-900">{selectedDays} days</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
                          <div className="text-sm font-medium text-gray-500 mb-2">Transport</div>
                          <div className="text-lg font-semibold text-gray-900 capitalize">{transportMode}</div>
                        </div>
                      </div>
                    </div>

                    {/* Flight Details Section */}
                    <div className="border-b border-gray-200 bg-white p-8">
                      <h3 className="text-2xl font-semibold flex items-center gap-3 mb-6">
                        <span className="text-2xl">✈️</span>
                        <span>Flight Details</span>
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                            <div>
                              <p className="text-lg font-semibold text-gray-900">Best Recommended Flight</p>
                              <p className="text-sm text-gray-500">Non-stop flight • Best price</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">₹7,704.78</p>
                              <p className="text-sm text-gray-500">per person</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Departure</p>
                              <p className="text-lg font-semibold text-gray-900">04:35 AM</p>
                              <p className="text-sm text-gray-600">24 Apr, DEL</p>
                            </div>
                            <div className="flex items-center justify-center">
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-500">Duration</p>
                                <p className="text-lg font-semibold text-gray-900">2h 35m</p>
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                  <span>DEL</span>
                                  <span className="border-t border-gray-300 w-12"></span>
                                  <span>GOI</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-500">Arrival</p>
                              <p className="text-lg font-semibold text-gray-900">07:10 AM</p>
                              <p className="text-sm text-gray-600">24 Apr, GOI</p>
                            </div>
                          </div>
                          <div className="pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-4">
                              <img src="/airline-logos/indigo.png" alt="IndiGo" className="h-8 w-8 object-contain"/>
                              <div>
                                <p className="font-semibold text-gray-900">IndiGo</p>
                                <p className="text-sm text-gray-500">Flight 1125</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Itinerary Section with better styling */}
                    <div className="bg-white p-8">
                      <h3 className="text-2xl font-semibold flex items-center gap-3 mb-6">
                        <span className="text-2xl">📅</span>
                        <span>Your Itinerary</span>
                      </h3>
                      <div className="prose prose-emerald max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-600 prose-strong:text-gray-900 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h2:mb-4">
                        <ReactMarkdown 
                          components={{
                            h1: ({...props}) => <h1 className="text-3xl font-bold text-gray-900 mb-6" {...props} />,
                            h2: ({...props}) => <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4 pb-2 border-b border-gray-200" {...props} />,
                            h3: ({...props}) => <h3 className="text-xl font-semibold text-gray-700 mt-6 mb-3" {...props} />,
                            p: ({...props}) => <p className="text-gray-600 leading-relaxed mb-4" {...props} />,
                            ul: ({...props}) => <ul className="list-disc list-inside space-y-2 mb-4" {...props} />,
                            li: ({...props}) => <li className="text-gray-600" {...props} />,
                            strong: ({...props}) => <strong className="font-semibold text-gray-900" {...props} />
                          }}
                        >
                          {tripPlan.plan}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Action Buttons with better styling */}
                    <div className="bg-white p-8 border-t border-gray-200">
                      <div className="flex gap-4">
                        <Button 
                          onClick={() => window.print()} 
                          variant="outline"
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-5 text-base font-medium hover:bg-gray-100 border-2 border-gray-200"
                        >
                          <span className="text-xl">🖨️</span> Print Itinerary
                        </Button>
                        <Button 
                          onClick={() => {
                            const blob = new Blob([tripPlan.plan], { type: 'text/plain' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'trip-itinerary.txt';
                            a.click();
                          }}
                          variant="outline"
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-5 text-base font-medium hover:bg-gray-100 border-2 border-gray-200"
                        >
                          <span className="text-xl">💾</span> Save Itinerary
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-7xl mb-6">🗺️</div>
                <p className="text-xl">Fill out the form to generate your personalized trip plan</p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Results View */}
        <div className="lg:hidden w-full p-4">
          {showPlan && tripPlan && (
            <Card className="border-none shadow-lg mt-8">
              <CardHeader className="bg-[#0B4619] text-white sticky top-20 z-10">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <span>🎯 Your Personalized Trip Plan</span>
                </CardTitle>
                <CardDescription className="text-gray-200">
                  Here&apos;s your AI-generated travel itinerary
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Summary Section */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
                      <span>✈️ Trip Summary</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">From</div>
                        <div className="font-medium">{selectedOrigin?.display_name.split(',')[0]}</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">To</div>
                        <div className="font-medium">{selectedPlace?.display_name.split(',')[0]}</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">Duration</div>
                        <div className="font-medium">{selectedDays} days</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">Transport</div>
                        <div className="font-medium capitalize">{transportMode}</div>
                      </div>
                    </div>
                  </div>

                  {/* Itinerary Section */}
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
                      <span>📅 Your Itinerary</span>
                    </h3>
                    <div className="prose prose-emerald max-w-none">
                      <ReactMarkdown>{tripPlan.plan}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <Button 
                      onClick={() => window.print()} 
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <span>🖨️</span> Print Itinerary
                    </Button>
                    <Button 
                      onClick={() => {
                        const blob = new Blob([tripPlan.plan], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'trip-itinerary.txt';
                        a.click();
                      }}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <span>💾</span> Save Itinerary
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

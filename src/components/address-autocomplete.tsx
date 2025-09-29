
"use client";

import { useState, useEffect, useRef } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

interface GoogleMapsPlaces {
  Autocomplete: any;
  AutocompleteService: any;
  PlacesServiceStatus: any;
}

interface GoogleMaps {
  places: GoogleMapsPlaces;
}

declare global {
  interface Window {
    google?: {
      maps: GoogleMaps;
    };
    initGoogleMaps?: () => void;
  }
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync internal state with external prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      if (window.google?.maps?.places) {
        setIsGoogleMapsLoaded(true);
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        return; // Already loading
      }

      const script = document.createElement('script');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.warn('Google Maps API key not found. Address autocomplete will not work.');
        return;
      }

      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      window.initGoogleMaps = () => {
        setIsGoogleMapsLoaded(true);
        if (window.google?.maps?.places?.AutocompleteService) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        }
      };

      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
  }, []);

  // Debounced search function
  const searchPlaces = (query: string) => {
    if (!autocompleteServiceRef.current || !query.trim()) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'US' }, // Restrict to US for K9 events
      },
      (predictions: any[], status: any) => {
        setIsLoading(false);

        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
          setPredictions(predictions);
          setShowDropdown(true);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the search
    if (isGoogleMapsLoaded) {
      debounceTimeoutRef.current = setTimeout(() => {
        searchPlaces(newValue);
      }, 300);
    }
  };

  const handlePredictionClick = (prediction: any) => {
    const selectedAddress = prediction.description;
    setInputValue(selectedAddress);
    onChange(selectedAddress);
    setShowDropdown(false);
    setPredictions([]);
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow click events on predictions
    setTimeout(() => {
      setShowDropdown(false);
    }, 150);
  };

  const handleInputFocus = () => {
    if (predictions.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="e.g., 1600 Amphitheatre Parkway, Mountain View, CA"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          autoComplete="off"
          className="pr-8"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Dropdown with predictions */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              onClick={() => handlePredictionClick(prediction)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {prediction.structured_formatting?.secondary_text || ''}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Show warning if Google Maps not available */}
      {!isGoogleMapsLoaded && inputValue && (
        <div className="text-xs text-muted-foreground mt-1">
          Address autocomplete unavailable - please enter address manually
        </div>
      )}
    </div>
  );
}

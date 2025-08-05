
"use client";

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { suggestAddress } from '@/ai/flows/suggest-address';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (inputValue.length > 2) {
        setIsLoading(true);
        setErrorMessage(null);
        try {
          const result = await suggestAddress({ query: inputValue });
          setSuggestions(result.suggestions);
          if (result.suggestions.length > 0) {
            setShowSuggestions(true);
          }
        } catch (error: any) {
          console.error("Failed to fetch address suggestions:", error);
          if (error.message && (error.message.includes('503') || error.message.includes('overloaded'))) {
            setErrorMessage("Suggestion service is temporarily busy. Please try again in a moment.");
          } else {
            setErrorMessage("Could not fetch suggestions.");
          }
          setSuggestions([]);
          setShowSuggestions(true); 
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setErrorMessage(null);
        setShowSuggestions(false);
      }
    }, 300); // Debounce API calls

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setErrorMessage(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      onChange(e.target.value);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
         <Input
            placeholder="e.g., 1600 Amphitheatre Parkway, Mountain View, CA"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
          />
          {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
      </div>
     
      {showSuggestions && (suggestions.length > 0 || errorMessage) && (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
          <ul className="py-1">
            {errorMessage ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{errorMessage}</li>
            ) : (
              suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="px-3 py-2 cursor-pointer hover:bg-accent"
                  onClick={() => handleSelect(suggestion)}
                >
                  {suggestion}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

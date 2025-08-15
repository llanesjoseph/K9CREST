
"use client";

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);

  // Sync internal state with external prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      onChange(e.target.value);
  }

  return (
    <div className="relative">
      <div className="relative">
         <Input
            placeholder="e.g., 1600 Amphitheatre Parkway, Mountain View, CA"
            value={inputValue}
            onChange={handleInputChange}
            autoComplete="off"
          />
      </div>
    </div>
  );
}

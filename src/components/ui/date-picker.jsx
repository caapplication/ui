import React, { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DatePicker({ value, onChange, ...props }) {
  const [date, setDate] = useState(value ? new Date(value) : null);
  const [inputValue, setInputValue] = useState(value ? format(new Date(value), 'dd/MM/yyyy') : '');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = React.useRef(null);

  useEffect(() => {
    setDate(value ? new Date(value) : null);
    setInputValue(value ? format(new Date(value), 'dd/MM/yyyy') : '');
  }, [value]);

  useEffect(() => {
    if (popoverOpen && inputRef.current) {
      // slight timeout to ensure popover rendering doesn't steal focus last minute
      setTimeout(() => {
        inputRef.current.focus();
      }, 0);
    }
  }, [popoverOpen]);

  const handleInputChange = (e) => {
    let newVal = e.target.value;

    // Whitelist: allow only digits, /, -, .
    if (!/^[0-9/\-.]*$/.test(newVal)) {
      return; // Reject invalid characters
    }

    setInputValue(newVal);

    // Try multiple formats
    const formats = ['dd/MM/yyyy', 'ddMMyyyy', 'dd-MM-yyyy', 'dd.MM.yyyy'];
    let parsedDate = null;

    for (const fmt of formats) {
      const d = parse(newVal, fmt, new Date());
      // build-in isNaN check for Date
      if (!isNaN(d) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
        // Additional check for ddMMyyyy to ensure full length (avoid matching '101202' as valid date loosely)
        if (fmt === 'ddMMyyyy' && newVal.length !== 8) continue;

        parsedDate = d;
        break;
      }
    }

    if (parsedDate) {
      setDate(parsedDate);
      if (onChange) {
        onChange(parsedDate);
      }
    }
  };

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setInputValue(format(selectedDate, 'dd/MM/yyyy'));
    setPopoverOpen(false);
    if (onChange) {
      onChange(selectedDate);
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="DD/MM/YYYY"
            value={inputValue}
            onChange={handleInputChange}
            className="pr-10"
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          {...props}
        />
      </PopoverContent>
    </Popover>
  );
}

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

import { subDays, isAfter, isBefore, startOfToday } from 'date-fns';

export function DatePicker({ value, onChange, disabled: customDisabled, className, ...props }) {
    const [date, setDate] = useState(value ? new Date(value) : null);
    const [inputValue, setInputValue] = useState(value ? format(new Date(value), 'dd/MM/yyyy') : '');
    const [popoverOpen, setPopoverOpen] = useState(false);
    const inputRef = React.useRef(null);

    const today = startOfToday();
    const minDate = subDays(today, 365);

    const isDateDisabled = (date) => {
        // First check if it's outside the global 365-day range
        const isOutsideRange = isAfter(date, today) || isBefore(date, minDate);
        if (isOutsideRange) return true;

        // Then check custom disabled logic if provided
        if (typeof customDisabled === 'function') {
            return customDisabled(date);
        }
        return !!customDisabled;
    };

  useEffect(() => {
    setDate(value ? new Date(value) : null);
    setInputValue(value ? format(new Date(value), 'dd/MM/yyyy') : '');
  }, [value]);

  useEffect(() => {
    if (popoverOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 0);
    }
  }, [popoverOpen]);

  const handleInputChange = (e) => {
    let newVal = e.target.value;
    if (!/^[0-9/\-.]*$/.test(newVal)) return;

    setInputValue(newVal);

    const formats = ['dd/MM/yyyy', 'ddMMyyyy', 'dd-MM-yyyy', 'dd.MM.yyyy'];
    let parsedDate = null;

    for (const fmt of formats) {
      const d = parse(newVal, fmt, new Date());
      if (!isNaN(d) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
        if (fmt === 'ddMMyyyy' && newVal.length !== 8) continue;
        parsedDate = d;
        break;
      }
    }

    if (parsedDate) {
      if (isDateDisabled(parsedDate)) {
        // Do not update state or trigger onChange if date is disabled
        return;
      }
      setDate(parsedDate);
      if (onChange) onChange(parsedDate);
    }
  };

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setInputValue(format(selectedDate, 'dd/MM/yyyy'));
    setPopoverOpen(false);
    if (onChange) onChange(selectedDate);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Input
            ref={inputRef}
            type="text"
            placeholder="DD/MM/YYYY"
            value={inputValue}
            onChange={handleInputChange}
            className="pr-10 h-11 rounded-full bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:ring-primary/20"
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0  border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={isDateDisabled}
          {...props}
          className="bg-transparent text-white p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

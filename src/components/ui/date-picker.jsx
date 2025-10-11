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

  useEffect(() => {
    setDate(value ? new Date(value) : null);
    setInputValue(value ? format(new Date(value), 'dd/MM/yyyy') : '');
  }, [value]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    const parsedDate = parse(e.target.value, 'dd/MM/yyyy', new Date());
    if (!isNaN(parsedDate)) {
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
            type="text"
            placeholder="DD/MM/YYYY"
            value={inputValue}
            onChange={handleInputChange}
            className="pr-10"
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          {...props}
        />
      </PopoverContent>
    </Popover>
  );
}

import React, { useState, useEffect } from 'react';
import { format, subDays, isAfter, isBefore, startOfToday } from 'date-fns';
import { Calendar as CalendarIcon, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export function DateRangePicker({ dateRange, onChange, className, placeholder = "Pick a date" }) {
    const [open, setOpen] = useState(false);
    const [tempRange, setTempRange] = useState(dateRange);
    const today = startOfToday();
    const minDate = subDays(today, 365);

    useEffect(() => {
        if (open) {
            setTempRange(dateRange);
        }
    }, [open, dateRange]);

    const handleApply = () => {
        onChange(tempRange);
        setOpen(false);
    };

    const handleClear = () => {
        setTempRange({ from: null, to: null });
        onChange({ from: null, to: null });
        setOpen(false);
    };

    return (
        <div className={cn("w-full", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant="outline"
                        className={cn(
                            "glass-input w-full sm:w-[260px] h-10 sm:h-11 rounded-full justify-start text-left font-normal text-white hover:bg-white/10 hover:text-white transition-all px-4 sm:px-6 text-sm",
                            !dateRange?.from && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 shrink-0" />

                        {dateRange?.from ? (
                            dateRange.to ? (
                                <span className="truncate">
                                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                </span>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span className="text-gray-400 truncate">{placeholder}</span>
                        )}
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="center"
                    className="
                        p-0
                        glass-card
                        border-white/10
                        shadow-2xl
                        w-[92vw]
                        sm:w-auto
                        max-w-[640px]
                    "
                >
                    <div className="p-2 sm:p-3">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={tempRange?.from || today}
                            selected={tempRange}
                            onSelect={setTempRange}
                            numberOfMonths={1}
                            className="
                                bg-transparent text-white
                                scale-90 sm:scale-100
                                origin-top
                            "
                            disabled={(date) => isAfter(date, today) || isBefore(date, minDate)}
                            fromYear={minDate.getFullYear()}
                            toYear={today.getFullYear()}
                        />
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 p-3 border-t border-white/10 bg-white/5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="text-gray-400 hover:text-white hover:bg-white/10 h-8 text-xs px-3"
                        >
                            <X className="mr-1 h-3 w-3" />
                            Clear
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleApply}
                            className="bg-primary text-white hover:bg-primary/90 h-8 text-xs px-4"
                        >
                            <Check className="mr-1 h-3 w-3" />
                            Apply
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
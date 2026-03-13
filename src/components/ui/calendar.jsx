import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useDayPicker, useNavigation } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-[#0b0c0e] rounded-2xl", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-8 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between pt-1 relative items-center mb-4",
        caption_label: "text-sm font-semibold text-white",
        caption_dropdowns: "flex justify-center gap-2",
        nav: "flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-white/5 p-0 text-white hover:bg-white/10 hover:text-white transition-colors border border-white/10"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        nav_container: "flex items-center gap-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex mb-2",
        head_cell: "text-gray-500 rounded-md w-10 font-medium text-[0.8rem] uppercase tracking-wider",
        row: "flex w-full mt-1",
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full [&:has([aria-selected].day-range-end)]:rounded-r-full [&:has([aria-selected].day-range-start)]:rounded-l-full focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal text-white hover:bg-white/10 transition-all rounded-full"
        ),
        day_selected: "bg-primary !text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-full font-semibold shadow-lg shadow-primary/20",
        day_today: "bg-white/10 text-white border border-white/20",
        day_outside: "text-gray-600 opacity-50",
        day_disabled: "text-gray-700 opacity-30 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-primary/20 aria-selected:!text-white font-medium !rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        Caption: ({ displayMonth, ...props }) => {
          const { fromYear, toYear } = useDayPicker();
          const { goToMonth, nextMonth, previousMonth } = useNavigation();
          
          const currentYear = displayMonth.getFullYear();
          const startYear = fromYear || currentYear - 10;
          const endYear = toYear || currentYear + 10;

          return (
            <div className="flex justify-between items-center w-full px-1">
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(value) => {
                    const newMonth = new Date(displayMonth);
                    newMonth.setMonth(parseInt(value, 10));
                    goToMonth(newMonth);
                  }}
                  value={displayMonth.getMonth().toString()}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[100px] border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors focus:ring-0 rounded-lg px-3">
                    <SelectValue>{format(displayMonth, "MMMM")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()} className="focus:bg-primary/20 focus:text-white cursor-pointer">
                        {format(new Date(displayMonth.getFullYear(), i, 1), "MMMM")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  onValueChange={(value) => {
                    const newMonth = new Date(displayMonth);
                    newMonth.setFullYear(parseInt(value, 10));
                    goToMonth(newMonth);
                  }}
                  value={displayMonth.getFullYear().toString()}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[80px] border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors focus:ring-0 rounded-lg px-3">
                    <SelectValue>{displayMonth.getFullYear()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: endYear - startYear + 1 }, (_, i) => (
                      <SelectItem key={startYear + i} value={(startYear + i).toString()} className="focus:bg-primary/20 focus:text-white cursor-pointer">
                        {startYear + i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white hover:bg-white/10 border border-white/10 bg-white/5"
                  onClick={() => previousMonth && goToMonth(previousMonth)}
                  disabled={!previousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white hover:bg-white/10 border border-white/10 bg-white/5"
                  onClick={() => nextMonth && goToMonth(nextMonth)}
                  disabled={!nextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }

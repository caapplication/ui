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
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between pt-1 relative items-center",
        caption_label: "text-sm font-medium hidden",
        caption_dropdowns: "flex justify-center gap-2",
        nav: "flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "mr-2",
        nav_button_next: "ml-2",
        nav_container: "flex items-center gap-2",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        Caption: ({ displayMonth, ...props }) => {
          const { fromYear, toYear } = useDayPicker();
          const { goToMonth, nextMonth, previousMonth } = useNavigation();
          return (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => previousMonth && goToMonth(previousMonth)}
                disabled={!previousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
                <Select
                  onValueChange={(value) => {
                    const newMonth = new Date(displayMonth);
                    newMonth.setMonth(parseInt(value, 10));
                    goToMonth(newMonth);
                  }}
                  value={displayMonth.getMonth().toString()}
                >
                  <SelectTrigger className="w-[120px] pr-1.5 focus:ring-0">
                    <SelectValue>{format(displayMonth, "MMMM")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
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
                  <SelectTrigger className="w-[100px] pr-1.5 focus:ring-0">
                    <SelectValue>{displayMonth.getFullYear()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: toYear - fromYear + 1 }, (_, i) => (
                      <SelectItem key={fromYear + i} value={(fromYear + i).toString()}>
                        {fromYear + i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => nextMonth && goToMonth(nextMonth)}
                disabled={!nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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

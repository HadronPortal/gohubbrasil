import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-medium text-[#c8d4e8] font-oswald uppercase tracking-wider",
        nav: "space-x-1 flex items-center",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "grid grid-cols-7 gap-1 mb-2",
        weekday: "text-[#8a9ab5] rounded-md w-full font-bold text-[10px] uppercase text-center",
        weeks: "flex flex-col gap-1 w-full mt-1",
        week: "grid grid-cols-7 gap-1 w-full",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-[#2a3347] hover:text-[#f0c040]"
        ),
        selected: "bg-[#f0c040] text-[#141b2a] hover:bg-[#f0c040] hover:text-[#141b2a] focus:bg-[#f0c040] focus:text-[#141b2a] rounded-md",
        today: "text-[#f0c040] border border-[#f0c040]/30 rounded-md",
        outside: "text-[#8a9ab5] opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === 'left') {
            return <ChevronLeft className="h-4 w-4" />
          }
          return <ChevronRight className="h-4 w-4" />
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

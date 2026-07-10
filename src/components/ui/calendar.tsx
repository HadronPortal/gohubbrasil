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
        caption_label: "text-sm font-semibold text-[#172033]",
        nav: "space-x-1 flex items-center",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "grid grid-cols-7 gap-1 mb-2",
        weekday: "text-[#64748B] rounded-md w-full font-semibold text-[10px] uppercase text-center",
        weeks: "flex flex-col gap-1 w-full mt-1",
        week: "grid grid-cols-7 gap-1 w-full",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-full p-0 font-normal text-[#172033] aria-selected:opacity-100 hover:bg-[#EAF0FF] hover:text-[#3157D5] rounded-[8px]"
        ),
        selected: "bg-[#3157D5] text-white hover:bg-[#274ac0] hover:text-white focus:bg-[#3157D5] focus:text-white rounded-[8px]",
        today: "text-[#3157D5] border border-[#3157D5]/30 rounded-[8px]",
        outside: "text-[#94A3B8] opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
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

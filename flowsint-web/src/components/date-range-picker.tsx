"use client"

import * as React from "react"
import { addDays, format, subMonths } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { useQueryState } from "nuqs"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DateRangePicker({ className }: React.HTMLAttributes<HTMLDivElement>) {
    // Use nuqs to store the date range in the URL
    const [fromParam, setFromParam] = useQueryState("start")
    const [toParam, setToParam] = useQueryState("end")

    // Parse the date from URL or use defaults
    const initialDateRange: DateRange = {
        from: fromParam ? new Date(fromParam) : subMonths(new Date(), 1),
        to: toParam ? new Date(toParam) : addDays(new Date(), 1),
    }

    const [date, setDate] = React.useState<DateRange | undefined>(initialDateRange)

    // Update URL when date range changes
    const handleDateChange = (range: DateRange | undefined) => {
        setDate(range)

        if (range?.from) {
            setFromParam(format(range.from, "yyyy-MM-dd"))
        } else {
            setFromParam(null)
        }

        if (range?.to) {
            setToParam(format(range.to, "yyyy-MM-dd"))
        } else {
            setToParam(null)
        }
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={handleDateChange}
                        numberOfMonths={2}
                    />
                    <div className="p-3 border-t border-border">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => {
                                const defaultFrom = subMonths(new Date(), 1)
                                const defaultTo = addDays(new Date(), 1)
                                setDate({
                                    from: defaultFrom,
                                    to: defaultTo,
                                })
                                setFromParam(format(defaultFrom, "yyyy-MM-dd"))
                                setToParam(format(defaultTo, "yyyy-MM-dd"))
                            }}
                        >
                            Reset
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

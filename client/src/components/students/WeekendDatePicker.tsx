import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { formatDateToLocal, isWeekendDate } from "@/utils/helper";

interface WeekendDatePickerProps {
    label: string;
    value: string;
    min?: string;
    max?: string;
    onChange: (date: string) => void;
    disabled?: boolean;
}

const parseDate = (date: string) => new Date(`${date}T00:00:00`);

export function WeekendDatePicker({
    label: fieldLabel,
    value,
    min,
    max,
    onChange,
    disabled = false,
}: WeekendDatePickerProps) {
    const [open, setOpen] = useState(false);
    const minDate = min ? parseDate(min) : undefined;
    const maxDate = max ? parseDate(max) : undefined;
    const selectedDate = value ? parseDate(value) : undefined;
    const label = selectedDate
        ? selectedDate.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        : "Choose a weekend";

    return (
        <div className="relative min-w-0">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                disabled={disabled}
                aria-expanded={open}
                aria-label={fieldLabel}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 text-left text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
            </button>

            {open && !disabled && (
                <div className="absolute right-0 top-full z-50 mt-2 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg">
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        defaultMonth={selectedDate || minDate}
                        startMonth={minDate}
                        endMonth={maxDate}
                        disabled={[
                            ...(minDate ? [{ before: minDate }] : []),
                            ...(maxDate ? [{ after: maxDate }] : []),
                            { dayOfWeek: [1, 2, 3, 4, 5] },
                        ]}
                        onSelect={(date) => {
                            if (!date) return;
                            const nextDate = formatDateToLocal(date);
                            if (!isWeekendDate(nextDate)) return;
                            onChange(nextDate);
                            setOpen(false);
                        }}
                        className="mx-auto"
                        classNames={{
                            button_previous: "min-h-11 min-w-11 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            button_next: "min-h-11 min-w-11 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            day_button: "min-h-10 min-w-10 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selected: "[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground",
                            today: "[&>button]:ring-1 [&>button]:ring-primary",
                            disabled: "text-muted-foreground opacity-30",
                            weekday: "text-xs font-medium text-muted-foreground",
                        }}
                    />
                </div>
            )}
        </div>
    );
}

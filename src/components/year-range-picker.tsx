'use client';

import { CalendarRange } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface YearRangePreset {
  label: string;
  from: number;
  to: number;
}

interface YearRangePickerProps {
  min: number;
  max: number;
  from: number;
  to: number;
  onChange: (range: [number, number]) => void;
  presets?: YearRangePreset[];
}

/**
 * A polished fiscal-year range picker built from shadcn primitives: a Popover
 * trigger that reads like a date-range field, opening a two-thumb Slider plus
 * quick-range presets.
 */
export function YearRangePicker({
  min,
  max,
  from,
  to,
  onChange,
  presets = [],
}: YearRangePickerProps) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const span = hi - lo + 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full justify-between gap-4 px-4 py-3 sm:w-auto sm:min-w-72"
        >
          <span className="flex items-center gap-3">
            <CalendarRange className="text-muted-foreground size-4" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                Fiscal year range
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {lo} – {hi}
              </span>
            </span>
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">{span} yrs</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Select fiscal years</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {lo} – {hi}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Slider
              min={min}
              max={max}
              step={1}
              value={[lo, hi]}
              onValueChange={(next) => onChange([next[0], next[1]] as [number, number])}
              aria-label="Fiscal year range"
            />
            <div className="text-muted-foreground flex justify-between text-[11px] tabular-nums">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>

          {presets.length > 0 ? (
            <div className="flex flex-col gap-2 border-t pt-4">
              <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                Quick ranges
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => {
                  const active = preset.from === lo && preset.to === hi;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onChange([preset.from, preset.to])}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-transparent bg-foreground text-background'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

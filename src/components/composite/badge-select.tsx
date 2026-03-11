"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

interface BadgeSelectOption {
  value: string;
  label: string;
}

interface BadgeSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: BadgeSelectOption[];
  placeholder?: string;
  className?: string;
}

export function BadgeSelect({ value, onChange, options, className }: BadgeSelectProps) {
  const toggle = useCallback(
    (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    },
    [value, onChange],
  );

  return (
    <div data-slot="badge-select" className={cn("flex flex-wrap gap-1", className)}>
      {options.map((option) => (
        <button key={option.value} type="button" onClick={() => toggle(option.value)}>
          <Badge variant={value.includes(option.value) ? "default" : "outline"} className="cursor-pointer">
            {option.label}
          </Badge>
        </button>
      ))}
    </div>
  );
}

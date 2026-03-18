"use client";

import { ChevronsUpDownIcon, LoaderIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

interface SearchSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  onSearchChange?: (search: string) => void;
  onOpen?: () => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
}

export function SearchSelect({
  value,
  onValueChange,
  onSearchChange,
  onOpen,
  options,
  placeholder = "Selecione...",
  emptyMessage = "Nenhum resultado encontrado",
  isLoading = false,
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) onOpen?.();
      }}
    >
      <div className={cn("relative w-full sm:w-56", className)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            <span className="truncate">{selectedOption?.label ?? placeholder}</span>
            <ChevronsUpDownIcon className="ml-1 size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onValueChange(null);
            }}
            className="absolute top-1/2 right-8 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput placeholder={placeholder} onValueChange={onSearchChange} />
          <CommandList className="mt-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    data-checked={opt.value === value}
                    onSelect={() => {
                      onValueChange(opt.value === value ? null : opt.value);
                      setOpen(false);
                    }}
                  >
                    {opt.label}
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

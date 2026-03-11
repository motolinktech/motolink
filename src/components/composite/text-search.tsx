"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

interface TextSearchProps {
  placeholder?: string;
  paramName?: string;
  debounceMs?: number;
  resetPageOnChange?: boolean;
  className?: string;
}

export function TextSearch({
  placeholder = "Pesquisar...",
  paramName = "search",
  debounceMs = 2500,
  resetPageOnChange = true,
  className,
}: TextSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(searchParams.get(paramName) ?? "");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const urlValue = searchParams.get(paramName) ?? "";
    setInputValue(urlValue);
  }, [searchParams, paramName]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const updateURL = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value.trim()) {
        params.set(paramName, value.trim());
      } else {
        params.delete(paramName);
      }

      if (resetPageOnChange) {
        params.delete("page");
      }

      const queryString = params.toString();
      const newURL = queryString ? `${pathname}?${queryString}` : pathname;

      router.push(newURL);
    },
    [searchParams, pathname, router, paramName, resetPageOnChange],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsDebouncing(true);
    timeoutRef.current = setTimeout(() => {
      updateURL(value);
      setIsDebouncing(false);
    }, debounceMs);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      updateURL(inputValue);
      setIsDebouncing(false);
    }
  };

  const handleClear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setInputValue("");
    updateURL("");
    setIsDebouncing(false);
  };

  return (
    <div className={cn("relative w-full md:min-w-72", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-9 pr-9"
        aria-label={placeholder}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {isDebouncing ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : inputValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleClear}
            aria-label="Limpar pesquisa"
            className="size-5 p-0 hover:bg-transparent"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PlanningPeriod } from "@/constants/planning-period";
import { PlanningClientCard } from "./planning-client-card";
import { SearchSelect } from "./search-select";

dayjs.extend(isoWeek);

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface PlanningWeekViewProps {
  clientsData: Array<{
    id: string;
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    uf: string;
    observations: string;
    provideMeal: boolean;
  }>;
  planningMap: Record<string, Record<string, Partial<Record<PlanningPeriod, number>>>>;
  weekStart: string;
  selectedGroupId?: string;
  selectedGroupName?: string;
  selectedClientId?: string;
  selectedClientName?: string;
}

type FetchOption = { value: string; label: string };

function useFetchOptions(url: string, debounceMs = 300) {
  const [options, setOptions] = useState<FetchOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOptions = useCallback(
    async (search?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const endpoint = new URL(url, window.location.origin);
        endpoint.searchParams.set("pageSize", "20");
        if (search?.trim()) endpoint.searchParams.set("search", search.trim());

        const res = await fetch(endpoint.toString(), { signal: controller.signal });
        if (!res.ok) return;

        const json = await res.json();
        const data: Array<{ id: string; name: string }> = json.data ?? [];
        setOptions(data.map((d) => ({ value: d.id, label: d.name })));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error fetching options:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    },
    [url],
  );

  const handleSearch = useCallback(
    (search: string) => {
      if (!hasFetched) {
        setHasFetched(true);
        fetchOptions(search);
        return;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fetchOptions(search), debounceMs);
    },
    [fetchOptions, debounceMs, hasFetched],
  );

  const ensureFetched = useCallback(() => {
    if (!hasFetched) {
      setHasFetched(true);
      fetchOptions();
    }
  }, [hasFetched, fetchOptions]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { options, isLoading, handleSearch, ensureFetched };
}

export function PlanningWeekView({
  clientsData,
  planningMap,
  weekStart,
  selectedGroupId,
  selectedGroupName,
  selectedClientId,
  selectedClientName,
}: PlanningWeekViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const groups = useFetchOptions("/api/groups");
  const clients = useFetchOptions("/api/clients");

  const weekStartDate = dayjs(weekStart);
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStartDate.add(i, "day"));

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const handleGroupChange = (val: string | null) => {
    updateParams({ group: val || undefined, client: undefined });
  };

  const handleClientChange = (val: string | null) => {
    updateParams({ client: val || undefined, group: undefined });
  };

  const handlePrevWeek = () => {
    updateParams({ week: weekStartDate.subtract(7, "day").format("YYYY-MM-DD") });
  };

  const handleNextWeek = () => {
    updateParams({ week: weekStartDate.add(7, "day").format("YYYY-MM-DD") });
  };

  const handleCurrentWeek = () => {
    updateParams({ week: undefined });
  };

  const weekLabel = `${weekStartDate.format("DD/MM/YY")} — ${weekStartDate.add(6, "day").format("DD/MM/YY")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <SearchSelect
            value={selectedGroupId ?? null}
            onValueChange={handleGroupChange}
            onOpen={groups.ensureFetched}
            onSearchChange={groups.handleSearch}
            options={
              selectedGroupId && !groups.options.some((o) => o.value === selectedGroupId)
                ? [{ value: selectedGroupId, label: selectedGroupName ?? "" }, ...groups.options]
                : groups.options
            }
            isLoading={groups.isLoading}
            placeholder="Filtrar por grupo..."
            emptyMessage="Nenhum grupo encontrado"
          />

          <SearchSelect
            value={selectedClientId ?? null}
            onValueChange={handleClientChange}
            onOpen={clients.ensureFetched}
            onSearchChange={clients.handleSearch}
            options={
              selectedClientId && !clients.options.some((o) => o.value === selectedClientId)
                ? [{ value: selectedClientId, label: selectedClientName ?? "" }, ...clients.options]
                : clients.options
            }
            isLoading={clients.isLoading}
            placeholder="Filtrar por cliente..."
            emptyMessage="Nenhum cliente encontrado"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCurrentWeek}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium">{weekLabel}</span>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {!selectedGroupId && !selectedClientId ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Nenhum filtro selecionado</AlertTitle>
          <AlertDescription>Selecione um grupo ou cliente para visualizar o planejamento</AlertDescription>
        </Alert>
      ) : clientsData.length === 0 ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Nenhum resultado</AlertTitle>
          <AlertDescription>Nenhum cliente encontrado para o filtro selecionado</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {clientsData.map((client) => (
            <PlanningClientCard
              key={client.id}
              client={client}
              weekStart={weekStart}
              weekDays={weekDays.map((d) => d.format("YYYY-MM-DD"))}
              dayLabels={DAY_LABELS}
              planningByDate={planningMap[client.id] ?? {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

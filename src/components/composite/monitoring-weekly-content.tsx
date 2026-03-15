"use client";

import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MonitoringWeeklyClientCard } from "./monitoring-weekly-client-card";
import { SearchSelect } from "./search-select";

dayjs.extend(isoWeek);

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

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

interface WorkShiftSlot {
  id: string;
  clientId: string;
  status: string;
  contractType: string;
  period: string[];
  startTime: string;
  endTime: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  deliverymenPaymentValue: string;
  totalValueToPay?: number | string;
  deliveryman?: { id: string; name: string } | null;
}

interface PlanningRecord {
  clientId: string;
  period: string;
  plannedCount: number;
}

interface WeeklyClientData {
  id: string;
  name: string;
  street: string;
  number: string;
  complement?: string | null;
  city: string;
  neighborhood: string;
  uf: string;
  provideMeal: boolean;
  commercialCondition?: Record<string, unknown> | null;
  days: Record<string, { planned: PlanningRecord[]; workShifts: WorkShiftSlot[] }>;
}

interface MonitoringWeeklyContentProps {
  selectedGroupId?: string;
  selectedGroupName?: string;
  selectedClientId?: string;
  selectedClientName?: string;
  weekStart: string;
}

export function MonitoringWeeklyContent({
  selectedGroupId,
  selectedGroupName,
  selectedClientId,
  selectedClientName,
  weekStart,
}: MonitoringWeeklyContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const groups = useFetchOptions("/api/groups");
  const clientsFilter = useFetchOptions("/api/clients");

  const [clients, setClients] = useState<WeeklyClientData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const weekStartDate = dayjs(weekStart);
  const weekEndDate = weekStartDate.add(6, "day");
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStartDate.add(i, "day").format("YYYY-MM-DD"));

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

  const weekLabel = `${weekStartDate.format("DD/MM/YY")} — ${weekEndDate.format("DD/MM/YY")}`;

  const abortControllerRef = useRef<AbortController | null>(null);

  const weekEnd = weekEndDate.format("YYYY-MM-DD");

  const fetchWeeklyData = useCallback(async () => {
    if (!selectedGroupId && !selectedClientId) return;

    try {
      const url = new URL("/api/monitoring/weekly", window.location.origin);
      url.searchParams.set("startDate", weekStart);
      url.searchParams.set("endDate", weekEnd);
      if (selectedGroupId) url.searchParams.set("groupId", selectedGroupId);
      if (selectedClientId) url.searchParams.set("clientId", selectedClientId);

      const res = await fetch(url.toString(), { signal: abortControllerRef.current?.signal });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(json?.error ?? "Não foi possível buscar os dados de monitoramento");
        return;
      }

      const json = await res.json();
      setClients(Array.isArray(json.clients) ? json.clients : []);
      setErrorMessage(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Error fetching weekly monitoring:", error);
      setErrorMessage("Não foi possível buscar os dados de monitoramento");
    }
  }, [selectedGroupId, selectedClientId, weekStart, weekEnd]);

  useEffect(() => {
    if (!selectedGroupId && !selectedClientId) {
      setClients([]);
      setErrorMessage(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPoll = () => {
      const jitterMs = 1_000 + Math.random() * 3_000;
      pollTimeout = setTimeout(async () => {
        if (controller.signal.aborted) return;
        await fetchWeeklyData();
        scheduleNextPoll();
      }, 60_000 + jitterMs);
    };

    fetchWeeklyData();
    scheduleNextPoll();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [selectedGroupId, selectedClientId, fetchWeeklyData]);

  const resolvedSelectedGroupName =
    groups.options.find((option) => option.value === selectedGroupId)?.label ?? selectedGroupName;
  const resolvedSelectedClientName =
    clientsFilter.options.find((option) => option.value === selectedClientId)?.label ?? selectedClientName;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SearchSelect
            value={selectedGroupId ?? null}
            onValueChange={handleGroupChange}
            onOpen={groups.ensureFetched}
            onSearchChange={groups.handleSearch}
            options={
              selectedGroupId && !groups.options.some((o) => o.value === selectedGroupId)
                ? [{ value: selectedGroupId, label: resolvedSelectedGroupName ?? "" }, ...groups.options]
                : groups.options
            }
            isLoading={groups.isLoading}
            placeholder="Filtrar por grupo..."
            emptyMessage="Nenhum grupo encontrado"
          />

          <SearchSelect
            value={selectedClientId ?? null}
            onValueChange={handleClientChange}
            onOpen={clientsFilter.ensureFetched}
            onSearchChange={clientsFilter.handleSearch}
            options={
              selectedClientId && !clientsFilter.options.some((o) => o.value === selectedClientId)
                ? [{ value: selectedClientId, label: resolvedSelectedClientName ?? "" }, ...clientsFilter.options]
                : clientsFilter.options
            }
            isLoading={clientsFilter.isLoading}
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
          <AlertDescription>Selecione um grupo ou cliente para visualizar o monitoramento semanal</AlertDescription>
        </Alert>
      ) : errorMessage ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : clients.length === 0 ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Nenhum resultado</AlertTitle>
          <AlertDescription>Nenhum cliente encontrado para o filtro selecionado</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <MonitoringWeeklyClientCard
              key={client.id}
              client={client}
              weekDays={weekDays}
              dayLabels={DAY_LABELS}
              onRefresh={fetchWeeklyData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

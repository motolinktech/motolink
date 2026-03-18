"use client";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { AlertCircleIcon, CalendarIcon, MoonIcon, SunIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContractTypeOptions } from "@/constants/contract-type";
import { cn } from "@/lib/cn";
import { MonitoringClientCard } from "./monitoring-client-card";
import { SearchSelect } from "./search-select";

dayjs.locale("pt-br");

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

interface MonitoringClient {
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
  planned: Array<{
    clientId: string;
    period: string;
    plannedCount: number;
  }>;
  workShifts: Array<{
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
    deliveryman?: { id: string; name: string; phone?: string } | null;
    deliverymanAmountDay?: number | string;
    deliverymanAmountNight?: number | string;
    deliverymanPaymentType?: string;
    paymentForm?: string;
    guaranteedQuantityDay?: number;
    guaranteedQuantityNight?: number;
    guaranteedDayTax?: number | string;
    guaranteedNightTax?: number | string;
    deliverymanPerDeliveryDay?: number | string;
    deliverymanPerDeliveryNight?: number | string;
    additionalTax?: number | string;
    additionalTaxReason?: string;
    isWeekendRate?: boolean;
  }>;
}

interface MonitoringDailyContentProps {
  selectedGroupId?: string;
  selectedGroupName?: string;
  selectedClientId?: string;
  selectedClientName?: string;
  selectedDate: string;
}

export function MonitoringDailyContent({
  selectedGroupId,
  selectedGroupName,
  selectedClientId,
  selectedClientName,
  selectedDate: selectedDateParam,
}: MonitoringDailyContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedDate = dayjs(selectedDateParam);
  const dateStr = selectedDate.format("YYYY-MM-DD");

  const groups = useFetchOptions("/api/groups");
  const clientsFilter = useFetchOptions("/api/clients");

  const [clients, setClients] = useState<MonitoringClient[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [contractTypeFilter, setContractTypeFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "DAYTIME" | "NIGHTTIME">("all");

  const copyClientId = searchParams.get("copyClientId") ?? undefined;
  const copySourceDate = searchParams.get("copySourceDate") ?? undefined;

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

  const handleCopy = (clientId: string) => {
    updateParams({ copyClientId: clientId, copySourceDate: dateStr });
  };

  const handleCancelCopy = () => {
    updateParams({ copyClientId: undefined, copySourceDate: undefined });
  };

  const handleGroupChange = (val: string | null) => {
    updateParams({ group: val || undefined, client: undefined });
  };

  const handleClientChange = (val: string | null) => {
    updateParams({ client: val || undefined, group: undefined });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    const formatted = dayjs(date).format("YYYY-MM-DD");
    updateParams({ date: formatted === dayjs().format("YYYY-MM-DD") ? undefined : formatted });
    setCalendarOpen(false);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMonitoringData = useCallback(async () => {
    if (!selectedGroupId && !selectedClientId) return;

    try {
      const url = new URL("/api/monitoring", window.location.origin);
      url.searchParams.set("targetDate", dateStr);
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
      console.error("Error fetching clients:", error);
      setErrorMessage("Não foi possível buscar os dados de monitoramento");
    }
  }, [selectedGroupId, selectedClientId, dateStr]);

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
        await fetchMonitoringData();
        scheduleNextPoll();
      }, 30_000 + jitterMs);
    };

    fetchMonitoringData();
    scheduleNextPoll();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [selectedGroupId, selectedClientId, fetchMonitoringData]);

  const resolvedSelectedGroupName =
    groups.options.find((option) => option.value === selectedGroupId)?.label ?? selectedGroupName;
  const resolvedSelectedClientName =
    clientsFilter.options.find((option) => option.value === selectedClientId)?.label ?? selectedClientName;

  const filteredClients = clients.map((client) => ({
    ...client,
    workShifts: client.workShifts.filter((ws) => {
      if (contractTypeFilter !== "all" && ws.contractType !== contractTypeFilter) return false;
      if (periodFilter !== "all" && !ws.period.some((p) => p.toUpperCase() === periodFilter)) return false;
      return true;
    }),
    planned:
      periodFilter === "all" ? client.planned : client.planned.filter((p) => p.period.toUpperCase() === periodFilter),
  }));

  const today = dayjs();
  const isToday = selectedDate.isSame(today, "day");
  const weekday = selectedDate.format("dddd");
  const dayNumber = selectedDate.format("D");
  const monthYear = selectedDate.format("MMMM [de] YYYY");

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

          <Select value={contractTypeFilter} onValueChange={setContractTypeFilter}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Tipo de contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os contratos</SelectItem>
              {ContractTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-md border border-border dark:border-input">
            <Button
              variant={periodFilter === "DAYTIME" ? "default" : "ghost"}
              size="icon-sm"
              className="rounded-r-none"
              onClick={() => setPeriodFilter((prev) => (prev === "DAYTIME" ? "all" : "DAYTIME"))}
              title="Diurno"
            >
              <SunIcon className="size-4" />
            </Button>
            <div className="w-px self-stretch bg-border dark:bg-input" />
            <Button
              variant={periodFilter === "NIGHTTIME" ? "default" : "ghost"}
              size="icon-sm"
              className="rounded-l-none"
              onClick={() => setPeriodFilter((prev) => (prev === "NIGHTTIME" ? "all" : "NIGHTTIME"))}
              title="Noturno"
            >
              <MoonIcon className="size-4" />
            </Button>
          </div>
        </div>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-full sm:w-[220px] justify-start font-normal")}>
              <CalendarIcon className="mr-2 size-4" />
              {selectedDate.format("DD/MM/YYYY")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate.toDate()}
              onSelect={handleDateChange}
              defaultMonth={selectedDate.toDate()}
              today={today.toDate()}
              classNames={{
                today: "bg-muted ring ring-primary/50",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div
        className={cn(
          "flex items-center gap-4 rounded-lg border px-5 py-4",
          isToday ? "border-primary/30 bg-primary/5" : "bg-muted/40",
        )}
      >
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-lg text-2xl font-bold",
            isToday ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          {dayNumber}
        </div>
        <div className="flex flex-col">
          <span className="text-base font-semibold capitalize">{weekday}</span>
          <span className="text-sm capitalize text-muted-foreground">{monthYear}</span>
        </div>
        {isToday && (
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Hoje
          </span>
        )}
      </div>

      {!selectedGroupId && !selectedClientId ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Nenhum filtro selecionado</AlertTitle>
          <AlertDescription>Selecione um grupo ou cliente para visualizar o monitoramento</AlertDescription>
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
          {copyClientId && copySourceDate && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-primary">
                Turnos copiados de {dayjs(copySourceDate).format("DD/MM/YYYY")}. Navegue para outra data e cole.
              </p>
              <Button variant="ghost" size="sm" onClick={handleCancelCopy}>
                <XIcon className="mr-1 size-3.5" />
                Cancelar
              </Button>
            </div>
          )}
          {filteredClients.map((client) => {
            const isCopyTarget = copyClientId === client.id && copySourceDate !== dateStr;
            return (
              <MonitoringClientCard
                key={client.id}
                client={client}
                plannings={client.planned.map((planning) => ({
                  clientId: planning.clientId,
                  period: planning.period.toUpperCase(),
                  plannedCount: planning.plannedCount,
                }))}
                workShiftSlots={client.workShifts}
                shiftDate={dateStr}
                onRefresh={fetchMonitoringData}
                copySourceDate={copySourceDate}
                isCopyTarget={isCopyTarget}
                onCopy={() => handleCopy(client.id)}
                onCancelCopy={handleCancelCopy}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

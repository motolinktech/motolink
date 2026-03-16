"use client";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { CalendarIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { PaymentRequestDetailSheet } from "@/components/composite/payment-request-detail-sheet";
import { PaymentRequestEditSheet } from "@/components/composite/payment-request-edit-sheet";
import { SearchSelect } from "@/components/composite/search-select";
import { TablePagination } from "@/components/composite/table-pagination";
import { type PaymentRequestListItem, PaymentRequestsList } from "@/components/lists/payment-requests-list";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_REQUEST_STATUS_LABELS, type PaymentRequestStatus } from "@/constants/payment-request-status";
import { cn } from "@/lib/cn";
import { paymentRequestStatusArr } from "@/modules/payment-requests/payment-requests-types";

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

interface FinanceiroContentProps {
  initialData: PaymentRequestListItem[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number };
  selectedDeliverymanId?: string;
  selectedDeliverymanName?: string;
  selectedClientId?: string;
  selectedClientName?: string;
  selectedDate?: string;
  selectedStatus?: string;
  userRole?: string;
}

export function FinanceiroContent({
  initialData,
  initialPagination,
  selectedDeliverymanId,
  selectedDeliverymanName,
  selectedClientId,
  selectedClientName,
  selectedDate,
  selectedStatus,
  userRole,
}: FinanceiroContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const deliverymen = useFetchOptions("/api/deliverymen");
  const clients = useFetchOptions("/api/clients");

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<PaymentRequestListItem | null>(null);
  const [editItem, setEditItem] = useState<PaymentRequestListItem | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset page when filters change
      params.delete("page");
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

  const handleDeliverymanChange = (val: string | null) => {
    updateParams({ deliveryman: val || undefined });
  };

  const handleClientChange = (val: string | null) => {
    updateParams({ client: val || undefined });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    const formatted = dayjs(date).format("YYYY-MM-DD");
    updateParams({ date: formatted });
    setCalendarOpen(false);
  };

  const handleClearDate = () => {
    updateParams({ date: undefined });
  };

  const handleStatusChange = (val: string) => {
    updateParams({ status: val === "ALL" ? undefined : val });
  };

  const resolvedDeliverymanName =
    deliverymen.options.find((o) => o.value === selectedDeliverymanId)?.label ?? selectedDeliverymanName;

  const resolvedClientName = clients.options.find((o) => o.value === selectedClientId)?.label ?? selectedClientName;

  const calendarDate = selectedDate ? dayjs(selectedDate) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <SearchSelect
            value={selectedDeliverymanId ?? null}
            onValueChange={handleDeliverymanChange}
            onOpen={deliverymen.ensureFetched}
            onSearchChange={deliverymen.handleSearch}
            options={
              selectedDeliverymanId && !deliverymen.options.some((o) => o.value === selectedDeliverymanId)
                ? [{ value: selectedDeliverymanId, label: resolvedDeliverymanName ?? "" }, ...deliverymen.options]
                : deliverymen.options
            }
            isLoading={deliverymen.isLoading}
            placeholder="Filtrar por entregador..."
            emptyMessage="Nenhum entregador encontrado"
          />

          <SearchSelect
            value={selectedClientId ?? null}
            onValueChange={handleClientChange}
            onOpen={clients.ensureFetched}
            onSearchChange={clients.handleSearch}
            options={
              selectedClientId && !clients.options.some((o) => o.value === selectedClientId)
                ? [{ value: selectedClientId, label: resolvedClientName ?? "" }, ...clients.options]
                : clients.options
            }
            isLoading={clients.isLoading}
            placeholder="Filtrar por cliente..."
            emptyMessage="Nenhum cliente encontrado"
          />

          <Select value={selectedStatus ?? "ALL"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {paymentRequestStatusArr.map((s) => (
                <SelectItem key={s} value={s}>
                  {PAYMENT_REQUEST_STATUS_LABELS[s as PaymentRequestStatus] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("w-[180px] justify-start font-normal", !calendarDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 size-4" />
                {calendarDate ? calendarDate.format("DD/MM/YYYY") : "Filtrar por data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={calendarDate?.toDate()}
                onSelect={handleDateChange}
                defaultMonth={calendarDate?.toDate()}
                today={dayjs().toDate()}
                classNames={{ today: "bg-muted ring ring-primary/50" }}
              />
            </PopoverContent>
          </Popover>
          {calendarDate && (
            <Button variant="ghost" size="sm" onClick={handleClearDate}>
              Limpar data
            </Button>
          )}
        </div>
      </div>

      <PaymentRequestsList items={initialData} onViewDetails={setDetailItem} onEdit={setEditItem} userRole={userRole} />

      <TablePagination
        page={initialPagination.page}
        pageSize={initialPagination.pageSize}
        totalPages={initialPagination.totalPages}
      />

      <PaymentRequestDetailSheet
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      />

      <PaymentRequestEditSheet
        item={editItem}
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
        onSuccess={() => {
          setEditItem(null);
          router.refresh();
        }}
      />
    </div>
  );
}

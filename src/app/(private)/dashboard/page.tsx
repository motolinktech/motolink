import { CalendarDays, CheckCircle, Clock, DollarSign, StickyNote } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cookieConst } from "@/constants/cookies";
import type { PaymentRequestStatus } from "@/constants/payment-request-status";
import { PAYMENT_REQUEST_STATUS_COLORS, PAYMENT_REQUEST_STATUS_LABELS } from "@/constants/payment-request-status";
import type { WorkShiftSlotStatus } from "@/constants/work-shift-slot-status";
import { WORK_SHIFT_SLOT_STATUS_COLORS, WORK_SHIFT_SLOT_STATUS_LABELS } from "@/constants/work-shift-slot-status";
import { cn } from "@/lib/cn";
import { paymentRequestsService } from "@/modules/payment-requests/payment-requests-service";
import { usersService } from "@/modules/users/users-service";
import { workShiftSlotsService } from "@/modules/work-shift-slots/work-shift-slots-service";
import { getCurrentDateKeyInSaoPaulo } from "@/utils/date-time";

// --- Helpers ---

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDate(): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

const WORK_SHIFT_STATUS_FLOW: WorkShiftSlotStatus[] = [
  "OPEN",
  "INVITED",
  "CONFIRMED",
  "CHECKED_IN",
  "PENDING_COMPLETION",
  "COMPLETED",
  "ABSENT",
  "CANCELLED",
  "REJECTED",
  "UNANSWERED",
];

function sortWorkShiftSummaryByFlow<T extends { status: string }>(rows: T[]): T[] {
  const statusOrder = new Map(WORK_SHIFT_STATUS_FLOW.map((status, index) => [status, index]));

  return [...rows].sort((a, b) => {
    const aOrder = statusOrder.get(a.status as WorkShiftSlotStatus) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = statusOrder.get(b.status as WorkShiftSlotStatus) ?? Number.MAX_SAFE_INTEGER;

    return aOrder - bOrder;
  });
}

// --- Page ---

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(cookieConst.USER_ID)?.value;
  const branchId = cookieStore.get(cookieConst.SELECTED_BRANCH)?.value;

  if (!userId) redirect("/login");

  const today = getCurrentDateKeyInSaoPaulo();

  const [userResult, shiftResult, financialResult] = await Promise.all([
    usersService().getById(userId),
    branchId ? workShiftSlotsService().getDashboardSummary(today, branchId) : null,
    branchId ? paymentRequestsService().getDashboardSummary(today, branchId) : null,
  ]);

  if (userResult.isErr() || !userResult.value) redirect("/login");

  const userName = getFirstName(userResult.value.name);

  const shiftSummary = shiftResult?.isOk()
    ? shiftResult.value
    : {
        byStatus: [],
        total: 0,
        confirmedCount: 0,
        byContractType: {
          freelancer: 0,
          independentCollaborator: 0,
        },
      };
  const financialSummary = financialResult?.isOk()
    ? financialResult.value
    : { byStatus: [], totalAmount: 0, pendingCount: 0 };
  const orderedShiftSummary = sortWorkShiftSummaryByFlow(shiftSummary.byStatus);

  const STAT_CARDS = [
    {
      label: "Freelancer hoje",
      value: String(shiftSummary.byContractType.freelancer),
      icon: CalendarDays,
      gradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
      text: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Colab. independente",
      value: String(shiftSummary.byContractType.independentCollaborator),
      icon: CheckCircle,
      gradient: "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
      text: "text-green-700 dark:text-green-300",
    },
    {
      label: "Pendentes financeiro",
      value: String(financialSummary.pendingCount),
      icon: DollarSign,
      gradient: "from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900",
      text: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Anotações",
      value: "0",
      icon: StickyNote,
      gradient: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
      text: "text-purple-700 dark:text-purple-300",
    },
  ];

  return (
    <main className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-muted-foreground capitalize">{formatDate()}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <Card key={card.label} size="sm" className={cn("bg-gradient-to-br border-0 shadow-none", card.gradient)}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className={cn("text-xs font-normal", card.text)}>{card.label}</span>
                <card.icon className={cn("size-4", card.text)} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-bold", card.text)}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Work-shift status summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Status dos turnos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderedShiftSummary.map((row) => (
              <div key={row.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cn(WORK_SHIFT_SLOT_STATUS_COLORS[row.status as WorkShiftSlotStatus])}>
                    {WORK_SHIFT_SLOT_STATUS_LABELS[row.status as WorkShiftSlotStatus]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        WORK_SHIFT_SLOT_STATUS_COLORS[row.status as WorkShiftSlotStatus],
                      )}
                      style={{ width: `${shiftSummary.total > 0 ? (row.count / shiftSummary.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-medium">{row.count}</span>
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-sm font-bold">{shiftSummary.total}</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial resume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="size-4" />
              Resumo financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {financialSummary.byStatus.map((row) => (
              <div key={row.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cn(PAYMENT_REQUEST_STATUS_COLORS[row.status as PaymentRequestStatus])}>
                    {PAYMENT_REQUEST_STATUS_LABELS[row.status as PaymentRequestStatus]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">({row.count})</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(row.amount)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-sm font-bold">{formatCurrency(financialSummary.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="size-4" />
              Anotações recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhuma anotação registrada.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

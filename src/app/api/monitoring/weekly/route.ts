import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";
import { cookieConst } from "@/constants/cookies";
import { monitoringService } from "@/modules/monitoring/monitoring-service";
import { monitoringWeeklyQuerySchema } from "@/modules/monitoring/monitoring-types";
import { verifySession } from "@/utils/verify-session";

export async function GET(request: NextRequest) {
  const auth = await verifySession();
  if (auth.error) return auth.error;

  const cookieStore = await cookies();
  const branchId = cookieStore.get(cookieConst.SELECTED_BRANCH)?.value;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = monitoringWeeklyQuerySchema.safeParse({ ...params, branchId });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const result = await monitoringService().getWeekly(parsed.data);

  if (result.isErr()) {
    return NextResponse.json({ error: result.error.reason }, { status: result.error.statusCode });
  }

  return NextResponse.json(result.value);
}

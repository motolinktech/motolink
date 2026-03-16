import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";
import { historyTracesService } from "@/modules/history-traces/history-traces-service";
import { historyTraceListQuerySchema } from "@/modules/history-traces/history-traces-types";
import { verifySession } from "@/utils/verify-session";

export async function GET(request: NextRequest) {
  const auth = await verifySession();
  if (auth.error) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = historyTraceListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const result = await historyTracesService().listAll(parsed.data);

  if (result.isErr()) {
    return NextResponse.json({ error: result.error.reason }, { status: result.error.statusCode });
  }

  return NextResponse.json(result.value);
}

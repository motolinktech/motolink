import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";
import { paymentRequestsService } from "@/modules/payment-requests/payment-requests-service";
import { paymentRequestListQuerySchema } from "@/modules/payment-requests/payment-requests-types";
import { verifySession } from "@/utils/verify-session";

export async function GET(request: NextRequest) {
  const auth = await verifySession();
  if (auth.error) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = paymentRequestListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos", details: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const result = await paymentRequestsService().listAll(parsed.data);

  if (result.isErr()) {
    return NextResponse.json({ error: result.error.reason }, { status: result.error.statusCode });
  }

  return NextResponse.json(result.value);
}

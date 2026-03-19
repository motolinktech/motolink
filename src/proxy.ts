import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookieConst } from "./constants/cookies";
import { sessionsService } from "./modules/sessions/sessions-service";

const publicPaths = ["/login", "/trocar-senha", "/confirmar-escala", "/esqueceu-a-senha"];

function clearSessionCookies(cookieStore: ReadonlyRequestCookies) {
  cookieStore.delete(cookieConst.SESSION_TOKEN);
  cookieStore.delete(cookieConst.SESSION_EXPIRES_AT);
}

export async function proxy(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(cookieConst.SESSION_TOKEN)?.value;
  const expiresAt = cookieStore.get(cookieConst.SESSION_EXPIRES_AT)?.value;
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);

  const hasValidToken = sessionToken && expiresAt && new Date(expiresAt) > new Date();

  if (!hasValidToken) {
    clearSessionCookies(cookieStore);
    return isPublicPath ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await sessionsService().validate(sessionToken);

  if (session.isErr()) {
    clearSessionCookies(cookieStore);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicPath || request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$|.*\\.jpg$).*)"],
};

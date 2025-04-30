import { createClient } from "@/lib/supabase/middleware";
import { i18nRouter } from "next-i18n-router";
import { NextResponse, type NextRequest } from "next/server";
import i18nConfig from "./i18nConfig";

export async function middleware(request: NextRequest) {
  const i18nResult = i18nRouter(request, i18nConfig);
  if (i18nResult) return i18nResult;

  const { supabase, response } = createClient(request);
  const session = await supabase.auth.getSession();

  const redirectToChat = session && request.nextUrl.pathname === "/";

  if (redirectToChat) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", session.data.session?.user.id)
      .maybeSingle();

    if (!profile?.username) {
      return NextResponse.redirect(new URL("/setup", request.url));
    }

    const { data: homeWorkspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", session.data.session?.user.id)
      .eq("is_home", true)
      .maybeSingle();

    if (homeWorkspace?.id) {
      return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, request.url));
    } else {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/", "/((?!api|_next|static|.*\\..*|_next|auth).*)"],
};

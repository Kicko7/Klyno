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
    const { data: homeWorkspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", session.data.session?.user.id)
      .eq("is_home", true)
      .single(); // .single() because only one home workspace per user

    // 🔥 Instead of throwing an error, let's *wait and retry* once if no workspace
    if (!homeWorkspace) {
      console.log("No home workspace found yet... retrying in 1s");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 second
      const { data: retryWorkspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", session.data.session?.user.id)
        .eq("is_home", true)
        .single();

      if (!retryWorkspace) {
        console.error("Still no workspace found. Redirecting to setup.");
        return NextResponse.redirect(new URL("/setup", request.url)); // fallback to setup page
      }

      return NextResponse.redirect(new URL(`/${retryWorkspace.id}/chat`, request.url));
    }

    return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|auth).*)"],
};

"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/sidebar/AppSiderbar";
import { useOrganizationStore } from "@/store/organization/store";
import { ImageOff, Loader2, Sparkles, Camera, Palette } from "lucide-react";

export default function Page() {
  const organizations = useOrganizationStore((state) => state.organizations);

  return (
    <SidebarProvider>
      <AppSidebar userOrgs={organizations} />
      <SidebarInset>
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-200/15 to-emerald-200/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-br from-teal-200/10 to-emerald-200/10 rounded-full blur-2xl animate-pulse delay-500"></div>
          </div>

          {/* Floating icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Camera className="absolute top-20 left-20 w-6 h-6 text-emerald-300/40 animate-bounce delay-300" />
            <Palette className="absolute top-32 right-32 w-5 h-5 text-teal-300/40 animate-bounce delay-700" />
            <Sparkles className="absolute bottom-40 left-16 w-4 h-4 text-emerald-400/40 animate-bounce delay-1000" />
            <Camera className="absolute bottom-20 right-20 w-5 h-5 text-teal-300/40 animate-bounce delay-1500" />
          </div>

          <div className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 py-12">
            {/* Main content card */}
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              
              {/* Main card */}
              <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl shadow-emerald-500/10 max-w-2xl">
                {/* Icon container with animated background */}
                <div className="relative mx-auto mb-8 w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl animate-pulse shadow-lg shadow-emerald-500/30"></div>
                  <div className="absolute inset-1 bg-gradient-to-br from-emerald-300 to-teal-400 rounded-xl animate-pulse delay-150"></div>
                  <ImageOff className="relative w-12 h-12 text-white drop-shadow-lg" />
                  
                  {/* Sparkle decorations */}
                  <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-emerald-400 animate-ping" />
                  <Sparkles className="absolute -bottom-1 -left-2 w-3 h-3 text-teal-400 animate-ping delay-700" />
                </div>

                {/* Title with gradient text */}
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-700 via-teal-600 to-blue-600 bg-clip-text text-transparent mb-4">
                  Gallery Under Construction
                </h2>

                {/* Subtitle */}
                <p className="text-slate-600 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                  We're crafting something truly spectacular for you. Our team is putting the finishing touches on an 
                  <span className="font-semibold text-emerald-600"> immersive visual experience</span> that will captivate and inspire.
                </p>

                {/* Feature preview cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200/50">
                    <Camera className="w-8 h-8 text-emerald-500 mb-2 mx-auto" />
                    <p className="text-emerald-700 text-sm font-medium">High-Quality Images</p>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-4 border border-teal-200/50">
                    <Palette className="w-8 h-8 text-teal-500 mb-2 mx-auto" />
                    <p className="text-teal-700 text-sm font-medium">Creative Collections</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
                    <Sparkles className="w-8 h-8 text-blue-500 mb-2 mx-auto" />
                    <p className="text-blue-700 text-sm font-medium">Interactive Experience</p>
                  </div>
                </div>

                {/* Loading indicator with enhanced styling */}
                <div className="flex items-center justify-center gap-3 text-emerald-600">
                  <div className="relative">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <div className="absolute inset-0 w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-sm opacity-50 animate-spin"></div>
                  </div>
                  <span className="text-base font-medium bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Loading awesomeness...
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-6 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2 rounded-full animate-pulse" style={{ width: '73%' }}></div>
                </div>
                <p className="text-slate-500 text-sm mt-2">73% Complete</p>
              </div>
            </div>

            {/* Bottom decoration */}
            <div className="mt-12 flex items-center gap-2 text-slate-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse delay-200"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-400"></div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/sidebar/AppSiderbar";
import { useOrganizationStore } from "@/store/organization/store";
import { ImageOff, Loader2, Sparkles, Camera, Palette, Hammer, Wrench, Code2, Rocket } from "lucide-react";

export default function Page() {
  const organizations = useOrganizationStore((state) => state.organizations);

  return (
    <SidebarProvider>
      <AppSidebar userOrgs={organizations} />
      <SidebarInset>
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50">
          {/* Construction tape diagonal pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,_transparent_48%,_rgba(234,_179,_8,0.1)_48%,_rgba(234,_179,_8,0.1)_52%,_transparent_52%)] bg-[length:40px_40px]"></div>
          </div>

          {/* Floating construction elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/4 w-24 h-24 bg-yellow-400/20 rounded-lg rotate-12 animate-[float_6s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-32 right-1/4 w-32 h-32 bg-orange-400/15 rounded-lg -rotate-12 animate-[float_8s_ease-in-out_infinite_1s]"></div>
          </div>

          {/* Animated tools floating around */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/5 animate-[toolFloat_8s_ease-in-out_infinite]">
              <Hammer className="w-8 h-8 text-amber-500/40" />
            </div>
            <div className="absolute top-1/3 right-1/4 animate-[toolFloat_10s_ease-in-out_infinite_0.3s]">
              <Wrench className="w-7 h-7 text-orange-500/40" />
            </div>
            <div className="absolute bottom-1/4 left-1/3 animate-[toolFloat_7s_ease-in-out_infinite_0.7s]">
              <Code2 className="w-6 h-6 text-blue-500/40" />
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 py-12">
            {/* Main content card */}
            <div className="relative group">
              {/* Construction tape header */}
              <div className="absolute -top-4 -left-4 right-4 h-8 bg-yellow-400/90 rotate-2 z-10 flex items-center justify-center overflow-hidden">
                <div className="whitespace-nowrap text-xs font-bold text-yellow-900 uppercase tracking-wider animate-[marquee_10s_linear_infinite]">
                  Under Construction • Coming Soon • Work In Progress • Under Construction • Coming Soon •
                </div>
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-all duration-1000 group-hover:duration-200 animate-pulse"></div>
              
              {/* Main card */}
              <div className="relative bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl shadow-amber-500/10 max-w-2xl">
                {/* Icon container */}
                <div className="relative mx-auto mb-8 w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl animate-pulse shadow-lg shadow-amber-500/30"></div>
                  <div className="absolute inset-1 bg-gradient-to-br from-amber-300 to-orange-400 rounded-xl animate-pulse delay-150"></div>
                  <Hammer className="relative w-12 h-12 text-white drop-shadow-lg" />
                  
                  {/* Sparkle decorations */}
                  <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 animate-ping" />
                  <Sparkles className="absolute -bottom-1 -left-2 w-3 h-3 text-orange-400 animate-ping delay-700" />
                </div>

                {/* Title with gradient text */}
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                  Under Construction
                </h2>

                {/* Subtitle */}
                <p className="text-slate-600 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                  We're hard at work building something amazing for you! Our team is hammering out the final details to bring you an
                  <span className="font-semibold text-amber-600"> exceptional experience</span>.
                </p>

                {/* Feature preview cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50">
                    <Camera className="w-8 h-8 text-amber-500 mb-2 mx-auto" />
                    <p className="text-amber-700 text-sm font-medium">New Features</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200/50">
                    <Palette className="w-8 h-8 text-orange-500 mb-2 mx-auto" />
                    <p className="text-orange-700 text-sm font-medium">Fresh Design</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200/50">
                    <Rocket className="w-8 h-8 text-red-500 mb-2 mx-auto" />
                    <p className="text-red-700 text-sm font-medium">Improved Performance</p>
                  </div>
                </div>

                {/* Loading indicator */}
                <div className="flex items-center justify-center gap-3 text-amber-600">
                  <div className="relative">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <div className="absolute inset-0 w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full blur-sm opacity-50 animate-spin"></div>
                  </div>
                  <span className="text-base font-medium bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    Building something great...
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-6 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full animate-pulse" 
                    style={{ width: '68%' }}
                  ></div>
                </div>
                <p className="text-slate-500 text-sm mt-2">68% Complete</p>
              </div>
            </div>

            {/* Bottom decoration */}
            <div className="mt-12 flex items-center gap-2 text-slate-400">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-200"></div>
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse delay-400"></div>
            </div>
          </div>
        </div>

        {/* Add keyframes to your global CSS */}
        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes toolFloat {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(10px, 15px) rotate(5deg); }
            50% { transform: translate(0, 30px) rotate(0deg); }
            75% { transform: translate(-10px, 15px) rotate(-5deg); }
          }
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </SidebarInset>
    </SidebarProvider>
  );
}
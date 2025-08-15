"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/sidebar/AppSiderbar";
import { useOrganizationStore } from "@/store/organization/store";
import { Wrench, Hammer,  Drill, Ruler, Settings, HardHat, Sparkles, Code2 } from "lucide-react";

export default function ToolsPage() {
  const organizations = useOrganizationStore((state) => state.organizations);

  return (
    <SidebarProvider>
      <AppSidebar userOrgs={organizations} />
      <SidebarInset>
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
          {/* Blueprint grid background */}
          <div className="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,#3b82f61f_1px,transparent_1px),linear-gradient(to_bottom,#3b82f61f_1px,transparent_1px)]"></div>
          
          {/* Floating tool shadows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/5 w-32 h-32 bg-blue-200/10 rounded-full blur-xl animate-[float_8s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-blue-300/10 rounded-full blur-xl animate-[float_10s_ease-in-out_infinite_2s]"></div>
          </div>

          {/* Animated tools */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/4 animate-[toolSpin_5s_linear_infinite]">
              <Wrench className="w-10 h-10 text-blue-500/50" />
            </div>
            <div className="absolute bottom-1/4 right-1/5 animate-[toolBounce_4s_ease-in-out_infinite_1s]">
              <Hammer className="w-8 h-8 text-blue-600/60" />
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 py-12">
            {/* Main construction sign */}
            <div className="relative group max-w-2xl w-full">
              {/* Danger stripes */}
              <div className="absolute -top-3 -left-3 -right-3 h-6 bg-[linear-gradient(45deg,#f59e0b_25%,#000_25%,#000_50%,#f59e0b_50%,#f59e0b_75%,#000_75%)] bg-[length:20px_20px] rounded-t-xl z-10"></div>
              
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-all duration-1000 group-hover:duration-200"></div>
              
              {/* Main panel */}
              <div className="relative bg-white/90 backdrop-blur-lg border border-blue-200/30 rounded-xl p-8 shadow-xl shadow-blue-500/10">
                {/* Tool icon cluster */}
                <div className="relative mx-auto mb-8 w-28 h-28">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200/50 shadow-sm">
                    <Wrench className="w-6 h-6 text-blue-600" />
                  </div>
               
                  <div className="absolute bottom-0 left-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200/50 shadow-sm">
                    <Ruler className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200/50 shadow-sm">
                    <Drill className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full border-4 border-blue-300 flex items-center justify-center shadow-md">
                    <Settings className="w-8 h-8 text-blue-600 animate-spin-slow" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-bold text-blue-800 mb-3">
                  Developer Tools
                </h2>
                <div className="text-blue-600 font-medium mb-6 flex items-center justify-center gap-2">
                  <HardHat className="w-5 h-5" />
                  <span>Under Construction</span>
                  <HardHat className="w-5 h-5" />
                </div>

                {/* Description */}
                <p className="text-slate-600 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                  Our powerful developer toolkit is being forged in the workshop. Expect precision instruments for 
                  <span className="font-medium text-blue-600"> code analysis</span>, 
                  <span className="font-medium text-blue-600"> debugging</span>, and 
                  <span className="font-medium text-blue-600"> performance tuning</span>.
                </p>

                {/* Feature grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                  {[
                    { icon: <Code2 className="w-5 h-5" />, text: "Code Inspector" },
                    { icon: <Sparkles className="w-5 h-5" />, text: "AI Assistant" },
                    { icon: <Ruler className="w-5 h-5" />, text: "Metrics" },
                    { icon: <Wrench className="w-5 h-5" />, text: "Utilities" },
                    { icon: <Drill className="w-5 h-5" />, text: "Debugger" },
                    { icon: <Settings className="w-5 h-5" />, text: "Tweaks" }
                  ].map((item, index) => (
                    <div 
                      key={index}
                      className="bg-blue-50/70 hover:bg-blue-100/50 transition-colors border border-blue-200/50 rounded-lg p-3 flex flex-col items-center gap-2"
                    >
                      <div className="text-blue-600">{item.icon}</div>
                      <span className="text-sm font-medium text-blue-800">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Status indicator */}
                <div className="bg-blue-100/50 border border-blue-200/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Toolkit Completion</span>
                    <span className="text-sm font-bold text-blue-600">65%</span>
                  </div>
                  <div className="w-full bg-blue-200/30 rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full animate-pulse" 
                      style={{ width: '65%' }}
                    ></div>
                  </div>
                </div>

                {/* Call to action */}
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg inline-flex items-center gap-2 transition-colors shadow-md shadow-blue-500/20">
                  <Sparkles className="w-4 h-4" />
                  <span>Notify Me When Ready</span>
                </button>
              </div>
            </div>

            {/* Footer note */}
            <p className="mt-8 text-sm text-blue-500/80 max-w-md mx-auto">
              Our engineering team is working around the clock to deliver these powerful development tools.
            </p>
          </div>

          {/* Add keyframes to your global CSS */}
          <style jsx global>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
            }
            @keyframes toolSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes toolBounce {
              0%, 100% { transform: translateY(0) rotate(-15deg); }
              50% { transform: translateY(-20px) rotate(15deg); }
            }
            .animate-spin-slow {
              animation: spin 3s linear infinite;
            }
          `}</style>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
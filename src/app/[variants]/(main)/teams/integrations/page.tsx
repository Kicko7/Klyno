"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/sidebar/AppSiderbar";
import { useOrganizationStore } from "@/store/organization/store";
import IntegrationsComingSoon from "./components/IntegrationsComingSoon";

export default function Page() {
  const organizations = useOrganizationStore((state) => state.organizations);

  return (
    <SidebarProvider>
      <AppSidebar userOrgs={organizations} />
      <SidebarInset>
        <IntegrationsComingSoon />
      </SidebarInset>
    </SidebarProvider>
  );
}
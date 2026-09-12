import { FrictionApp } from "@/components/friction-hunter/friction-app";
import { createDemoDashboard, type DashboardData } from "@/lib/demo-dashboard";
import { getDashboard } from "@/lib/friction-store";

export default async function Home() {
  let initialData: DashboardData;
  try {
    initialData = (await getDashboard()) as DashboardData;
  } catch {
    initialData = createDemoDashboard();
  }
  return <FrictionApp initialData={initialData} />;
}

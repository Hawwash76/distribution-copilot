import { APP_NAME } from "@distribution-copilot/config";

/**
 * Dashboard placeholder. Intentionally empty — real widgets are added later.
 */
export default function DashboardPage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="text-muted-foreground">Dashboard placeholder — nothing here yet.</p>
    </main>
  );
}

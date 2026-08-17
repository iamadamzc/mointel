import { DashboardShell } from '@/components/DashboardShell';
import { getDashboardState } from '@/lib/data';

// The desk always reflects the current sheet state, so nothing is prerendered
// at build time. Upstream read frequency is governed by the server cache.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Server-rendered first paint; the client then polls /api/dashboard.
  const initialState = await getDashboardState();

  return <DashboardShell initialState={initialState} />;
}

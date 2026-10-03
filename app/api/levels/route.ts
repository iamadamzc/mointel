import { gateApiRequest } from '@/lib/auth/requestGate';
import { levelsResponse } from '@/lib/market/levelsResponse';

/**
 * GET /api/levels?symbol=X: one name's stored resistance levels, for a
 * signed-in, admitted session. The read and its contract live in
 * `lib/market/levelsResponse.ts`, shared with the review route.
 */

// Read from the local store per request, never by Next.js caching, the same
// as /api/market.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  return levelsResponse(request);
}

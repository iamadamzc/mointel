import { NextResponse } from 'next/server';

import { getMarketSnapshot } from '@/lib/market/readModel';
import { loadMarketConfig } from '@/lib/market/config';
import { databaseExists, openDatabase, SCHEMA_VERSION } from '@/lib/market/store/db';

/**
 * Operational health, in one request.
 *
 * `systemctl status` says whether four processes exist. It cannot say whether
 * the store is reachable, whether the schema is the one this build expects, or
 * whether the SIP connection went quiet an hour ago — which are the questions
 * actually worth asking after a deploy or a reboot.
 *
 * It reuses the same read model the dashboard does, so a green light here means
 * the same thing a green light on the desk does rather than something adjacent
 * to it. Nothing secret is reported: no keys, no prompts, no filing text, no
 * paths beyond the schema version. The public route sits behind Basic Auth
 * anyway; server-side checks reach it over localhost, which does not.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const config = loadMarketConfig();

  let schemaVersion: number | null = null;
  let dbReachable = false;
  let dbProblem: string | null = null;

  if (!databaseExists(config.dbPath)) {
    dbProblem = 'no state store on disk';
  } else {
    try {
      const db = openDatabase(config.dbPath, { readonly: true, skipSchema: true });
      schemaVersion = Number(db.pragma('user_version', { simple: true }));
      db.close();
      dbReachable = true;
      if (schemaVersion !== SCHEMA_VERSION) {
        dbProblem = `schema v${schemaVersion}, this build expects v${SCHEMA_VERSION}`;
      }
    } catch (error) {
      dbProblem = (error as Error).message;
    }
  }

  const snapshot = dbReachable ? getMarketSnapshot() : null;

  /*
   * `ok` is deliberately narrow: the web process is answering, the store is
   * readable, and its schema is the one this build was compiled against.
   *
   * Worker state is reported below but does not fail the check. A desk with no
   * market worker is exactly what staging looks like, and at 03:00 a perfectly
   * healthy feed is silent — a probe that went red for either would be red
   * most of the time and would teach whoever reads it to ignore it.
   */
  const ok = dbReachable && schemaVersion === SCHEMA_VERSION;

  return NextResponse.json(
    {
      ok,
      web: 'ok',
      checkedAt: new Date().toISOString(),
      database: {
        reachable: dbReachable,
        schemaVersion,
        expectedSchemaVersion: SCHEMA_VERSION,
        problem: dbProblem,
      },
      market: snapshot && {
        state: snapshot.marketHealth.state,
        label: snapshot.marketHealth.label,
        live: snapshot.marketHealth.live,
        connection: snapshot.marketHealth.connection,
        messageAgeSeconds: snapshot.marketHealth.messageAgeSeconds,
        heartbeatAgeSeconds: snapshot.marketHealth.heartbeatAgeSeconds,
        tradingDate: snapshot.discovery.tradingDate,
        sessionPhase: snapshot.discovery.sessionPhase,
        board: snapshot.discovery.board,
      },
      research: snapshot && {
        state: snapshot.researchHealth.state,
        running: snapshot.researchHealth.running,
        queuedJobs: snapshot.researchHealth.queuedJobs,
        activeCount: snapshot.researchHealth.activeCount,
        heartbeatAgeSeconds: snapshot.researchHealth.heartbeatAgeSeconds,
        lastCompletedAt: snapshot.researchHealth.lastCompletedAt,
      },
      assessments: snapshot && {
        state: snapshot.assessments.scheduler.state,
        running: snapshot.assessments.scheduler.running,
        tradingDate: snapshot.assessments.tradingDate,
        last: snapshot.assessments.last && {
          type: snapshot.assessments.last.type,
          completedAt: snapshot.assessments.last.completedAt,
          status: snapshot.assessments.last.status,
        },
        next: snapshot.assessments.next && {
          type: snapshot.assessments.next.type,
          scheduledFor: snapshot.assessments.next.scheduledFor,
        },
      },
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}

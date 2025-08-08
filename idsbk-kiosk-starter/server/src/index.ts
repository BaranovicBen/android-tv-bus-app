import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetch as undiciFetch } from 'undici';

const app = express();

const PORT = Number(process.env.PORT || 8787);
const API_BASE_URL = process.env.API_BASE_URL || '';
const API_KEY = process.env.API_KEY || '';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Simple health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, serverTime: new Date().toISOString() });
});

/**
 * Online departures proxy (GetOnlineStopTime)
 * For now returns mock data. Swap out with real fetch when creds arrive.
 */
app.get('/api/online/:stopId', async (req, res) => {
  const { stopId } = req.params;

  // Example real fetch (uncomment & adapt when docs are available):
  // const r = await undiciFetch(`${API_BASE_URL}/GetOnlineStopTime?stopId=${encodeURIComponent(stopId)}`, {
  //   headers: { Authorization: `Bearer ${API_KEY}` }
  // });
  // const data = await r.json();

  // Mock: build departures relative to "now"
  const now = Date.now();
  const mk = (mins: number, route: string, headsign: string, delaySec = 0) => {
    const scheduled = new Date(now + mins * 60_000).toISOString();
    const adjusted = new Date(new Date(scheduled).getTime() + delaySec * 1000).toISOString();
    return { routeShortName: route, headsign, scheduled, delaySec, adjusted, source: 'LIVE' as const };
  };
  const payload = {
    stopId,
    updatedAt: new Date().toISOString(),
    departures: [
      mk(2, '70', 'Letisko', 180),
      mk(9, '61', 'Hlavná stanica', -60),
      mk(18, '39', 'Patrónka', 0)
    ]
  };
  res.json(payload);
});

/**
 * Offline timetable endpoint (PLAN)
 * In production, load from your static bundle or DB.
 */
app.get('/api/plan/:stopId', (req, res) => {
  const { stopId } = req.params;
  const now = Date.now();
  const mk = (mins: number, route: string, headsign: string) => {
    const scheduled = new Date(now + mins * 60_000).toISOString();
    return { routeShortName: route, headsign, scheduled, source: 'PLAN' as const };
    };
  const payload = {
    stopId,
    generatedAt: new Date().toISOString(),
    departures: [
      mk(2, '70', 'Letisko'),
      mk(9, '61', 'Hlavná stanica'),
      mk(18, '39', 'Patrónka'),
      mk(25, '21', 'Dolné hony')
    ]
  };
  res.json(payload);
});

/**
 * Merged departures: prefer LIVE when available, fall back to PLAN.
 * Very naive merge by key (route+headsign) within ±3 minutes of scheduled time.
 */
app.get('/api/departures/:stopId', async (req, res) => {
  const { stopId } = req.params;

  // In production, call the real endpoints / data sources:
  // const liveRes = await undiciFetch(`${API_BASE_URL}/GetOnlineStopTime?stopId=${encodeURIComponent(stopId)}`, {...});
  // const planRes = await loadOfflinePlan(stopId);
  // const live = await liveRes.json();
  // const plan = await planRes.json();

  const [live, plan] = await Promise.all([
    (await (await fetch(`http://localhost:${PORT}/api/online/${stopId}`)).json()),
    (await (await fetch(`http://localhost:${PORT}/api/plan/${stopId}`)).json())
  ]);

  const tolMs = 3 * 60 * 1000;

  const out: any[] = [];
  const usedPlan = new Set<number>();

  for (const l of live.departures) {
    out.push(l);
    // try to mark the matched plan item as used
    const idx = plan.departures.findIndex((p: any) =>
      p.routeShortName === l.routeShortName &&
      p.headsign === l.headsign &&
      Math.abs(new Date(p.scheduled).getTime() - new Date(l.scheduled).getTime()) <= tolMs
    );
    if (idx >= 0) usedPlan.add(idx);
  }

  // add remaining plan items that didn't have live data
  plan.departures.forEach((p: any, i: number) => {
    if (!usedPlan.has(i)) out.push(p);
  });

  // sort by next departure time (adjusted if LIVE, else scheduled)
  out.sort((a: any, b: any) => {
    const ta = new Date(a.adjusted ?? a.scheduled).getTime();
    const tb = new Date(b.adjusted ?? b.scheduled).getTime();
    return ta - tb;
  });

  res.json({
    stopId,
    updatedAt: new Date().toISOString(),
    departures: out
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

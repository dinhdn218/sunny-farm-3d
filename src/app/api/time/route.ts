// The server's clock, so the game's day doesn't follow a device whose clock was changed (lib/clock)
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}

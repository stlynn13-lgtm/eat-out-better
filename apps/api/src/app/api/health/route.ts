/**
 * GET /api/health
 *
 * Readiness probe for Vercel, uptime monitors, and CI checks.
 */

import { NextResponse } from "next/server";

// Never cache or prerender: a health probe must report the running deployment,
// not a snapshot baked at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  // Vercel injects this on every deployment (Settings > Environment Variables >
  // "Automatically expose System Environment Variables", on by default).
  // Locally it is undefined, hence the "local" fallback. Only the short SHA is
  // returned: enough to tell which deploy is live, without advertising the
  // branch, environment or full commit to anyone who calls this.
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;

  return NextResponse.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
    commit: commitSha ? commitSha.slice(0, 7) : "local",
  });
}

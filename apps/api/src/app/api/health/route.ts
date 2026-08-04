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
  // Vercel injects these on every deployment (Settings > Environment Variables >
  // "Automatically expose System Environment Variables", on by default).
  // Locally they are undefined, hence the "local" fallbacks.
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  return NextResponse.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    commit: commitSha ? commitSha.slice(0, 7) : "local",
    commitSha,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
  });
}

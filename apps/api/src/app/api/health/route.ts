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
  // Locally it is undefined, hence the "local" fallback.
  //
  // Deliberately minimal: this endpoint is public, so it reports only enough
  // to tell which build is live (the short commit). Branch names, the full SHA
  // and the environment name help an attacker map the deployment and add
  // nothing a human checking "is my merge live?" needs.
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;

  return NextResponse.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
    commit: commitSha ? commitSha.slice(0, 7) : "local",
  });
}

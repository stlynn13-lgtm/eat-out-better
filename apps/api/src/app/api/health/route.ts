/**
 * GET /api/health
 *
 * Readiness probe for Vercel, uptime monitors, and CI checks.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
  });
}

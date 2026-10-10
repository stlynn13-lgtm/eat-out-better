import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Eat Out Better: snap a restaurant menu, every dish scored for your cholesterol.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ROWS = [
  { name: "Cedar-Grilled Salmon", score: "8.7", dot: "#16a34a", bg: "#e2f0e4", ink: "#166534" },
  { name: "Chicken Fajitas", score: "5.8", dot: "#d97706", bg: "#fbecd2", ink: "#92400e" },
  { name: "Fettuccine Alfredo", score: "1.8", dot: "#dc2626", bg: "#f8e0dc", ink: "#991b1b" },
];

export default async function Image() {
  const mark = await readFile(join(process.cwd(), "public/mark.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#faf6ec", padding: 72, fontFamily: "serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markSrc} width={64} height={64} style={{ borderRadius: 16 }} alt="" />
            <span style={{ fontSize: 34, fontWeight: 700, color: "#13221c" }}>Eat Out Better</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 70, lineHeight: 1.02, fontWeight: 700, color: "#13221c", letterSpacing: -2 }}>
              Know what to order before the server comes back.
            </span>
            <span style={{ marginTop: 24, fontSize: 28, color: "#48554e", fontFamily: "sans-serif" }}>
              Every dish on the menu, scored for your cholesterol.
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, marginLeft: 48, flex: 1 }}>
          {ROWS.map((r) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: r.bg, borderRadius: 24, padding: "26px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 16, height: 16, borderRadius: 999, background: r.dot }} />
                <span style={{ fontSize: 26, fontWeight: 700, color: "#13221c" }}>{r.name}</span>
              </div>
              <span style={{ fontSize: 34, fontWeight: 700, color: r.ink }}>{r.score}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

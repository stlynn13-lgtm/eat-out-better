import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eat Out Better — Smart choices for a healthier heart",
};

// App logo — dark green bullseye
function AppLogo() {
  return (
    <div className="w-24 h-24 mx-auto mb-6">
      <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="48" cy="48" r="48" fill="#1B4332" />
        {/* Target rings */}
        <circle cx="48" cy="48" r="28" stroke="#22C55E" strokeWidth="3" fill="none" />
        <circle cx="48" cy="48" r="16" stroke="#22C55E" strokeWidth="3" fill="none" />
        <circle cx="48" cy="48" r="6" fill="#22C55E" />
      </svg>
    </div>
  );
}

// Feature pill
function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
      <span>{icon}</span>
      {label}
    </span>
  );
}

export default function WelcomePage() {
  return (
    <main className="app-shell px-5 pt-12 pb-8">
      {/* Tag */}
      <div className="flex justify-center mb-8">
        <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-800">
          You are on the right track
        </span>
      </div>

      {/* Logo */}
      <AppLogo />

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Eat Out Better
        </h1>
        <p className="mt-2 text-base text-gray-500 font-medium">
          Smart choices for a healthier heart.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <FeaturePill icon="🍽️" label="Analyze" />
        <FeaturePill icon="📊" label="Rank" />
        <FeaturePill icon="✅" label="Choose" />
      </div>

      {/* Value prop card */}
      <div className="card p-5 mb-8 bg-white">
        <p className="text-sm font-semibold text-gray-800 mb-3">
          Built for high cholesterol management
        </p>
        <ul className="space-y-2.5">
          {[
            "Take a photo of your menu — no typing required",
            "Every dish ranked best to worst for your heart",
            "Informed choice in under 30 seconds",
          ].map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-gray-600">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <svg
                  className="w-2.5 h-2.5 text-green-600"
                  fill="none"
                  viewBox="0 0 10 10"
                >
                  <path
                    d="M1.5 5L3.5 7L8.5 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="mt-auto space-y-3">
        <Link
          href="/capture"
          className="btn-primary flex items-center justify-center text-center rounded-2xl py-4 w-full text-base font-semibold text-white no-underline"
          style={{ backgroundColor: "#1B4332" }}
        >
          Get Started
        </Link>
        <details className="text-center">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-colors list-none">
            How it works →
          </summary>
          <div className="mt-4 text-left space-y-3 text-sm text-gray-600">
            {[
              {
                step: "1",
                title: "Photograph the menu",
                desc: "Point your camera at any page of a physical or digital menu. Add multiple pages if needed.",
              },
              {
                step: "2",
                title: "We read every dish",
                desc: "Our AI extracts all dish names and descriptions — no typing needed.",
              },
              {
                step: "3",
                title: "Get your ranked results",
                desc: "Every dish is scored 1–10 for heart health impact. Green = best, red = highest concern.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-900 text-xs font-bold flex items-center justify-center">
                  {item.step}
                </span>
                <div>
                  <p className="font-semibold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </main>
  );
}

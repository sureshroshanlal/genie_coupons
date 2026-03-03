/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,mdx}",
    "./components/**/*.{astro,html,js,jsx,ts,tsx,mdx}",
    "./pages/**/*.{astro,html,js,jsx,ts,tsx,mdx}",
    "./layouts/**/*.{astro,html,js,jsx,ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Outfit",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        "store-card":
          "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2)",
        "card-hover": "0 8px 32px rgba(137,233,0,0.12)",
      },
      colors: {
        // ── Verified Badge ──
        "verified-badge": {
          gold: "#FFD700",
          silver: "#C0C0C0",
          bronze: "#CD7F32",
        },

        // ── Brand ──
        "brand-primary": "#89E900",
        "brand-secondary": "#75C900",
        "brand-pressed": "#5EA300",
        "brand-dark": "#181818",
        "brand-muted": "#707068",

        // ── Accent ──
        "brand-accent": "#89E900",
        "brand-accent-soft": "rgba(137,233,0,0.12)",
        "brand-accent-text": "#181818",

        // ── Deal Tags ──
        "tag-verified": "#4ade80",
        "tag-expiring": "#fbbf24",
        "tag-exclusive": "#a78bfa",

        // ── Typography ──
        "text-primary": "#F5F5F0",
        "text-secondary": "#B0B0A8",
        "text-muted": "#707068",
        link: "#89E900",
        "link-hover": "#75C900",

        // ── Backgrounds ──
        "bg-default": "#181818",
        "bg-surface": "#222222",
        "bg-subtle": "#2a2a2a",
        "bg-elevated": "#2e2e2e",
        "border-default": "#333333",

        // ── Legacy ──
        "brand-navybg": "#181818",
        "brand-saving": "#89E900",
        "brand-harbor": "#75C900",
        "brand-anchor": "#89E900",
        "brand-waves": "#F5F5F0",
        "brand-tagline": "#707068",

        // ── Surface tokens ──
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "on-surface": "var(--on-surface)",
      },
    },
  },
  plugins: [],
};

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
          "0 4px 6px -1px rgba(34,34,34,0.08), 0 2px 4px -1px rgba(34,34,34,0.05)",
        "card-hover": "0 8px 24px rgba(137,233,0,0.18)",
      },
      colors: {
        // ── Verified Badge Colors ──
        "verified-badge": {
          gold: "#FFD700",
          silver: "#C0C0C0",
          bronze: "#CD7F32",
        },

        // ── Genie Coupon Brand Colors ──
        "brand-primary": "#89E900", // Electric Lime
        "brand-secondary": "#75C900", // Lime hover
        "brand-pressed": "#5EA300", // Lime pressed
        "brand-dark": "#222222", // Charcoal
        "brand-muted": "#666666", // Muted grey

        // ── Accent ──
        "brand-accent": "#222222", // Charcoal
        "brand-accent-soft": "#2E2E2E",
        "brand-accent-text": "#89E900", // Lime on charcoal

        // ── Deal Tag Colors ──
        "tag-verified": "#0F766E",
        "tag-expiring": "#F59E0B",
        "tag-exclusive": "#222222",

        // ── Typography ──
        "text-primary": "#222222",
        "text-secondary": "#444444",
        "text-muted": "#666666",
        link: "#222222",
        "link-hover": "#5EA300",

        // ── Backgrounds ──
        "bg-default": "#F5F5F5",
        "bg-surface": "#FFFFFF",
        "bg-subtle": "#EBEBEB",
        "border-default": "#D0D0D0",

        // ── Legacy named tokens ──
        "brand-navybg": "#222222",
        "brand-saving": "#89E900",
        "brand-harbor": "#75C900",
        "brand-anchor": "#89E900",
        "brand-waves": "#222222",
        "brand-tagline": "#666666",

        // ── Surface tokens (CSS-var backed) ──
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "on-surface": "var(--on-surface)",
      },
    },
  },
  plugins: [],
};

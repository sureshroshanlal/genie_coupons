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
      // 🔥 Store Page-Specific Extensions (Won't affect homepage)
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        "store-card":
          "0 4px 6px -1px rgba(0, 0, 255, 0.1), 0 2px 4px -1px rgba(0, 0, 255, 0.06)",
      },
      colors: {
        // ✅ Verified Badge Colors
        "verified-badge": {
          gold: "#FFD700",
          silver: "#C0C0C0",
          bronze: "#CD7F32",
        },
        // ✅ Brand Colors (from logo)
        "brand-primary": "#12866f", // Teal
        "brand-secondary": "#2076cd", // Blue
        "brand-accent": "#1282A2", // Gradient midpoint
        "brand-dark": "#0B1220", // Navy background
        'brand-muted': '#0C324F', // muted dark (muted backgrounds)
        'surface': 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'on-surface': 'var(--on-surface)',
        'brand-saving': '#008660', /* teal */
        'brand-harbor': '#0077FF', /* blue */
        'brand-anchor': '#00B4DB', /* gradient midpoint */
        'brand-waves': '#0083B0', /* background navy */
        'brand-navybg': '#0B0F1A', /* dark navy */
        'brand-tagline': '#E4E4E4', /* light gray */
      },
    },
  },
  plugins: [],
};

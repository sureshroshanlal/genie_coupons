import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import critters from "astro-critters";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  site: "https://geniecoupon.com",
  trailingSlash: "never",
  integrations: [
    tailwind(),
    react(),
    critters({
      preload: "swap",
      pruneSource: true,
      compress: true,
    }),
  ],
  redirects: {
    "/coupons": {
      status: 301,
      destination: "/todays-deals",
    },
    "/store/[...slug]": {
      status: 301,
      destination: "/stores/[...slug]",
    },
  },
});

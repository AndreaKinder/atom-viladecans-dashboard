import { defineConfig, passthroughImageService } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  image: {
    service: passthroughImageService(),
  },
  adapter: cloudflare(),
});

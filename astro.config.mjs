import { defineConfig, passthroughImageService } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  image: {
    service: passthroughImageService(),
  },
  adapter: node({
    mode: "standalone",
  }),
});

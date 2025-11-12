import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

export default defineConfig(() => {
  return {
    base: "/",
    plugins: [react(), cloudflare()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      port: 3002,
      strictPort: true,
      allowedHosts: ["chat-preview"],
      hmr: {
        protocol: "wss",
        clientPort: 443,
        path: "/vite-hmr",
        overlay: false,
      },
      headers: {
        "Content-Security-Policy":
          "default-src 'self' data: blob:; media-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https: data:; font-src 'self' https: data:; img-src 'self' https: data: blob:; connect-src 'self' https: wss: ws: http:; frame-src 'self' https: data: blob: https://js.stripe.com https://hooks.stripe.com; frame-ancestors *; object-src 'none'; base-uri 'self';",
        "X-Frame-Options": "ALLOWALL",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    },
  };
});

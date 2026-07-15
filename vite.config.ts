/*
 * Copyright (C) 2026 Yukthi Systems Private Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { defineConfig, loadEnv } from 'vite'; // 1. Import loadEnv
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      tailwindcss(),
      TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
      react(),
      svgr(),
      VitePWA({
        registerType: 'autoUpdate', // Automatically update the service worker
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Mail Service 25',
          short_name: 'Webmail',
          description: 'A modern, fast webmail client built with React and TanStack.',
          theme_color: '#f97316',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/', // ← add this
          scope: '/',
          icons: [
            {
              src: 'icons/icon-48x48.png',
              sizes: '48x48',
              type: 'image/png',
            },
            {
              src: 'icons/icon-72x72.png',
              sizes: '72x72',
              type: 'image/png',
            },
            {
              src: 'icons/icon-96x96.png',
              sizes: '96x96',
              type: 'image/png',
            },
            {
              src: 'icons/icon-128x128.png',
              sizes: '128x128',
              type: 'image/png',
            },
            {
              src: 'icons/icon-144x144.png',
              sizes: '144x144',
              type: 'image/png',
            },
            {
              src: 'icons/icon-152x152.png',
              sizes: '152x152',
              type: 'image/png',
            },
            {
              src: 'icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-256x256.png',
              sizes: '256x256',
              type: 'image/png',
            },
            {
              src: 'icons/icon-384x384.png',
              sizes: '384x384',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
          // Serve cached index.html for all navigation requests (SPA routing)
          navigateFallback: 'index.html',
          // Take control immediately on first install, no waiting for reload
          clientsClaim: true,
          skipWaiting: true,
          // Exclude API calls from SW interception
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'https://new.webmail-api.mail25.info',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          //secure: false,
        },
      },
      allowedHosts: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-tanstack': ['@tanstack/react-query', '@tanstack/react-router'],
            'vendor-radix': ['@radix-ui/themes'],
            'vendor-tiptap': ['@tiptap/react', '@tiptap/starter-kit'],
            'vendor-heavy': ['mammoth', 'xlsx', 'postal-mime', 'jszip'],
          },
        },
      },
    },
  };
});

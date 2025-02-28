// https://nuxt.com/docs/api/configuration/nuxt-config
const srcDir = 'src/'
export default defineNuxtConfig({
    srcDir,
    ssr: false,
    compatibilityDate: '2025-02-07',
    devtools: { enabled: false },
    dir: {
        public: 'public',
        assets: srcDir + '/assets',
    },
    devServer: {
        port: 5167,
    },
    vite: {
        // Better support for Tauri CLI output
        clearScreen: false,
        // Enable environment variables
        // Additional environment variables can be found at
        // https://v2.tauri.app/reference/environment-variables/
        envPrefix: ['VITE_'],
        server: {
          // Tauri requires a consistent port
          strictPort: true,
          hmr: {
            // Use websocket for mobile hot reloading
            protocol: 'ws',
            // Make sure it's available on the network
            host: '0.0.0.0',
            // Use a specific port for hmr
            port: 5183,
          },
        },
        build: {
            target: 'esnext',
        }
    },
    modules: ["@nuxt/ui", "@nuxtjs/tailwindcss", "@nuxt/icon", "@nuxtjs/google-adsense", "shadcn-nuxt"],
    css: [
        '@fortawesome/fontawesome-svg-core/styles.css'
    ],
    tailwindcss: {
        cssPath: `${srcDir}/assets/css/tailwind.css`,
        // default config
        
        config: [
            "tailwind.config.js",
        ]
    },
    postcss: {
    },
    runtimeConfig: {
        public: {
            AUTH_TOKEN: process.env.AUTH_TOKEN,
            API_TOKEN: process.env.API_TOKEN,
            SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
            SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
            ADSENSE_CLIENT_ID: process.env.ADSENSE_CLIENT_ID,
            DISCORD_INVITE: process.env.DISCORD_INVITE,
            API_URL: process.env.API_URL,
            WS_URL: process.env.WS_URL,
        }
    },
    shadcn: {
        prefix: '',
        componentDir: 'src/components/ui'
    },
    googleAdsense: {
        onPageLoad: false,
        pageLevelAds: false,
        id: process.env.ADSENSE_CLIENT_ID,
        test: true
    }
})
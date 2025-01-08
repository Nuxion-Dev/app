// https://nuxt.com/docs/api/configuration/nuxt-config
const srcDir = 'src/'
export default defineNuxtConfig({
    srcDir,
    ssr: false,
    devtools: { enabled: true },
    dir: {
        public: 'public',
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
    },
    modules: ["@nuxt/ui", "@nuxtjs/tailwindcss", "@nuxt/icon", "@nuxtjs/google-adsense"],
    css: [
        '@fortawesome/fontawesome-svg-core/styles.css'
    ],
    tailwindcss: {
        cssPath: `${srcDir}/assets/tailwindcss/tailwind.css`,
        // default config
        config: {
            content: [
                `${srcDir}/**/*.{html,css,js,vue,ts,jsx,tsx}`,
            ]
        }
    },
    postcss: {
    },
    runtimeConfig: {
        public: {
            AUTH_TOKEN: process.env.AUTH_TOKEN,
            SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
            SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
            ADSENSE_CLIENT_ID: process.env.ADSENSE_CLIENT_ID,
            DISCORD_INVITE: process.env.DISCORD_INVITE,
            API_URL: process.env.API_URL,
            WS_URL: process.env.WS_URL,
        }
    }
})
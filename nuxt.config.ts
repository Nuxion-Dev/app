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
    modules: ["@nuxt/ui", "@nuxtjs/tailwindcss", "@nuxt/icon"],
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
            apiKey: "AIzaSyCineJ7DoAaDmsFZjh0MlCJZaUKr_oHy4o",
            authDomain: "nexium-4786d.firebaseapp.com",
            projectId: "nexium-4786d",
            storageBucket: "nexium-4786d.appspot.com",
            messagingSenderId: "1062042081648",
            appId: "1:1062042081648:web:639dbb262e1f61084a17b5",
            measurementId: "G-XHH3166KC4"
        }
    }
})
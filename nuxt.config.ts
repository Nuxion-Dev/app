// https://nuxt.com/docs/api/configuration/nuxt-config
const srcDir = 'src/'
export default defineNuxtConfig({
    srcDir,
    devtools: { enabled: true },
    modules: ["@nuxt/ui", "@nuxtjs/tailwindcss"],
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
    }
})
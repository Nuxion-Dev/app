import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getAuth } from "firebase/auth"
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from "firebase/analytics"

export default defineNuxtPlugin(nuxtApp => {
    const config = useRuntimeConfig()

    const options: FirebaseOptions = {
        apiKey: (config.public.apiKey || '') as string,
        authDomain: (config.public.authDomain || '') as string,
        projectId: (config.public.projectId || '') as string,
        storageBucket: (config.public.storageBucket || '') as string,
        messagingSenderId: (config.public.messagingSenderId || '') as string,
        appId: (config.public.appId || '') as string,
        measurementId: (config.public.measurementId || '') as string
    };
    const app = initializeApp(options)

    const analytics = getAnalytics(app)
    const auth = getAuth(app)
    const firestore = getFirestore(app)

    nuxtApp.vueApp.provide('auth', auth)
    nuxtApp.provide('auth', auth)

    nuxtApp.vueApp.provide('firestore', firestore)
    nuxtApp.provide('firestore', firestore)
})
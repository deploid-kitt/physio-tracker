// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
    },
  },

  app: {
    head: {
      title: 'PhysioTracker',
      meta: [
        { name: 'description', content: 'Camera-based exercise tracking and analysis' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  css: [
    '~/assets/css/main.css',
  ],

  typescript: {
    strict: true,
  },

  nitro: {
    preset: 'node-server',
  },

  compatibilityDate: '2024-01-01',
})

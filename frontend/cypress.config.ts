import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    // On tourne contre le vrai backend dockerisé
    env: {
      apiUrl: 'http://localhost:3000/api/v1',
      // Compte admin bootstrappé via npm run seed:admin
      adminEmail: 'platform-admin@consignart.com',
      adminPassword: 'change_me_admin',
    },
    viewportWidth: 1280,
    viewportHeight: 800,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // Rien de spécial pour l'instant
    },
  },
});

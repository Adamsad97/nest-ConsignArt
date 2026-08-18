// cypress/support/commands.ts
// Commandes Cypress réutilisables pour ConsignArt

/**
 * Connexion rapide via l'API directement (sans passer par l'UI)
 * Utile pour ne pas répéter le flow de login dans chaque test
 */
Cypress.Commands.add('loginViaApi', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email, password },
  }).then((resp) => {
    window.localStorage.setItem('token', resp.body.accessToken);
    window.localStorage.setItem('user', JSON.stringify(resp.body.user));
  });
});

/**
 * Inscription via l'API (pour pré-créer des comptes de test)
 */
Cypress.Commands.add('registerViaApi', (email: string, password: string, role: string) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: { email, password, role },
    failOnStatusCode: false, // Le compte peut déjà exister
  });
});

/**
 * Activer un utilisateur (via admin)
 */
Cypress.Commands.add('activateUserViaApi', (userId: string, adminToken: string) => {
  cy.request({
    method: 'PATCH',
    url: `${Cypress.env('apiUrl')}/users/${userId}/activate`,
    headers: { Authorization: `Bearer ${adminToken}` },
  });
});

// TypeScript : déclaration des types custom
declare global {
  namespace Cypress {
    interface Chainable {
      loginViaApi(email: string, password: string): Chainable<void>;
      registerViaApi(email: string, password: string, role: string): Chainable<Response<any>>;
      activateUserViaApi(userId: string, adminToken: string): Chainable<void>;
    }
  }
}

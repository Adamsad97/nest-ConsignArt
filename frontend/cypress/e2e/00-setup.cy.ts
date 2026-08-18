// cypress/e2e/00-setup.cy.ts
// Script de setup initial : vérifie que l'infra est bien en place avant tous les tests

describe('00 — Setup & Health Check', () => {

  it('le backend est bien accessible sur le port 3000', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/health`,
      failOnStatusCode: false,
    }).then((resp) => {
      // 200 ou 404 (si pas de route /health) — l'important c'est de pas avoir ECONNREFUSED
      expect(resp.status).to.be.oneOf([200, 404]);
    });
  });

  it('le frontend est accessible sur le port 5173', () => {
    cy.visit('/');
    cy.title().should('exist');
  });

  it('le compte admin existe déjà (seed:admin a été lancé)', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/auth/login`,
      body: {
        email: Cypress.env('adminEmail'),
        password: Cypress.env('adminPassword'),
      },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body.accessToken).to.be.a('string');
      expect(resp.body.user.role).to.eq('admin');
    });
  });

  it('la Swagger est accessible pour référence', () => {
    cy.request({
      method: 'GET',
      url: 'http://localhost:3000/api/docs',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 301, 302]);
    });
  });
});

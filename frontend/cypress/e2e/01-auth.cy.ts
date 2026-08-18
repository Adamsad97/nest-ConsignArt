// cypress/e2e/01-auth.cy.ts
// UC 1-4 : Authentification complète

describe('UC1-4 — Authentification', () => {

  // Email unique par run pour éviter les conflits
  const timestamp = Date.now();
  const newGalleryEmail = `galerie-${timestamp}@test.com`;
  const newGalleryPassword = 'TestPassword123!';

  // ----------------------------------------------------------------
  // UC 1 — Inscription
  // ----------------------------------------------------------------
  describe('UC1 — Inscription', () => {
    it('affiche le formulaire d\'inscription', () => {
      cy.visit('/register');
      cy.get('h2').should('contain', 'Inscription');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('select').should('be.visible'); // choix du rôle
    });

    it('inscrit une nouvelle galerie avec succès', () => {
      cy.visit('/register');
      cy.get('input[type="email"]').type(newGalleryEmail);
      cy.get('input[type="password"]').type(newGalleryPassword);
      cy.get('select').select('gallery');
      cy.get('button[type="submit"]').click();
      // Après inscription, on est redirigé vers /login
      cy.url().should('include', '/login');
    });

    it('affiche une erreur si l\'email est déjà utilisé', () => {
      cy.visit('/register');
      cy.get('input[type="email"]').type(newGalleryEmail); // même email
      cy.get('input[type="password"]').type(newGalleryPassword);
      cy.get('select').select('gallery');
      cy.get('button[type="submit"]').click();
      cy.get('[data-cy="error-message"]').should('be.visible');
    });

    it('bloque l\'inscription avec rôle "admin"', () => {
      // Le select ne doit pas avoir "admin" comme option
      cy.visit('/register');
      cy.get('select option[value="admin"]').should('not.exist');
    });
  });

  // ----------------------------------------------------------------
  // UC 2 — Connexion
  // ----------------------------------------------------------------
  describe('UC2 — Connexion', () => {
    it('affiche le formulaire de connexion', () => {
      cy.visit('/login');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });

    it('affiche une erreur avec des mauvais identifiants', () => {
      cy.visit('/login');
      cy.get('input[type="email"]').type('mauvais@email.com');
      cy.get('input[type="password"]').type('mauvaismdp');
      cy.get('button[type="submit"]').click();
      cy.get('[data-cy="error-message"]').should('be.visible');
    });

    it('connecte l\'admin avec succès et redirige vers /dashboard', () => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(Cypress.env('adminEmail'));
      cy.get('input[type="password"]').type(Cypress.env('adminPassword'));
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
      // Le token doit être dans le localStorage
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.not.be.null;
      });
    });
  });

  // ----------------------------------------------------------------
  // UC 3 — Déconnexion
  // ----------------------------------------------------------------
  describe('UC3 — Déconnexion', () => {
    beforeEach(() => {
      cy.loginViaApi(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
      cy.visit('/dashboard');
    });

    it('déconnecte l\'utilisateur et efface le localStorage', () => {
      cy.get('[data-cy="logout-btn"]').click();
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });
  });

  // ----------------------------------------------------------------
  // UC 4 — Refresh token (testé via l'API, pas de UI dédiée)
  // ----------------------------------------------------------------
  describe('UC4 — Refresh token (API)', () => {
    it('retourne un nouveau access token avec un refresh token valide', () => {
      // On se connecte d'abord pour avoir un refresh token
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/login`,
        body: {
          email: Cypress.env('adminEmail'),
          password: Cypress.env('adminPassword'),
        },
      }).then((loginResp) => {
        const refreshToken = loginResp.body.refreshToken;
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/auth/refresh`,
          body: { refreshToken },
        }).then((refreshResp) => {
          expect(refreshResp.status).to.eq(200);
          expect(refreshResp.body.accessToken).to.be.a('string');
        });
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { BusinessRuleViolationFilter } from '../src/common/filters/business-rule-violation.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { User } from '../src/users/entities/user.entity';
import { Role } from '../src/users/enums/role.enum';

/**
 * Covers the modules not exercised by app.e2e-spec.ts: health, categories,
 * exhibitions (with the ON_LOAN lifecycle), loans and reports dashboards.
 */
describe('ConsignArt exhibitions, loans and reports (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;

  const suffix = `lc-${Date.now()}`;
  const password = 'Password123!';
  const galleryEmail = `gallery-${suffix}@test.com`;
  const borrowerEmail = `borrower-${suffix}@test.com`;
  const adminEmail = `admin-${suffix}@test.com`;

  let adminToken: string;
  let galleryToken: string;
  let galleryUserId: string;
  let borrowerGalleryUserId: string;
  let artistId: string;
  let exhibitedArtworkId: string;
  let soldArtworkId: string;
  let categoryId: string;
  let exhibitionId: string;
  let loanId: string;

  const server = () => request(app.getHttpServer());

  const registerAndActivateGallery = async (
    email: string,
  ): Promise<{ id: string; token: string }> => {
    const registerRes = await server()
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        firstName: 'Galerie',
        lastName: suffix,
        role: 'gallery',
      })
      .expect(201);
    const id = registerRes.body.data.id as string;

    await server()
      .patch(`/api/v1/users/${id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const loginRes = await server()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return { id, token: loginRes.body.data.access_token as string };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(
      new GlobalExceptionFilter(),
      new BusinessRuleViolationFilter(),
    );
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new ResponseInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Same bootstrap as `npm run seed:admin`: admins cannot self-register.
    const hashedPassword = await bcrypt.hash(password, 10);
    await usersRepository.save(
      usersRepository.create({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'ConsignArt',
        role: Role.ADMIN,
        isActive: true,
      }),
    );
    const adminLogin = await server()
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    adminToken = adminLogin.body.data.access_token as string;

    const gallery = await registerAndActivateGallery(galleryEmail);
    galleryToken = gallery.token;
    galleryUserId = gallery.id;
    const borrower = await registerAndActivateGallery(borrowerEmail);
    borrowerGalleryUserId = borrower.id;

    const artistRes = await server()
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${galleryToken}`)
      .send({ firstName: 'Berthe', lastName: 'Morisot', nationality: 'French' })
      .expect(201);
    artistId = artistRes.body.data.id as string;

    const exhibitedRes = await server()
      .post('/api/v1/artworks')
      .set('Authorization', `Bearer ${galleryToken}`)
      .send({
        title: `The Cradle ${suffix}`,
        artistId,
        price: 3000,
        reservePrice: 2000,
      })
      .expect(201);
    exhibitedArtworkId = exhibitedRes.body.data.id as string;

    const soldRes = await server()
      .post('/api/v1/artworks')
      .set('Authorization', `Bearer ${galleryToken}`)
      .send({
        title: `Summer Day ${suffix}`,
        artistId,
        price: 6000,
        reservePrice: 4000,
      })
      .expect(201);
    soldArtworkId = soldRes.body.data.id as string;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe('health', () => {
    it('GET /api/v1/health reports the API and database as up without a token', async () => {
      const res = await server().get('/api/v1/health').expect(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          status: 'ok',
          database: 'up',
          uptime: expect.any(Number),
        }),
      );
    });
  });

  describe('pagination', () => {
    it('returns a pagination envelope when page/limit are provided', async () => {
      const res = await server()
        .get('/api/v1/artworks?page=1&limit=1')
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          items: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          limit: 1,
          pageCount: expect.any(Number),
        }),
      );
      expect(res.body.data.items.length).toBeLessThanOrEqual(1);
    });

    it('rejects an invalid page number', async () => {
      await server().get('/api/v1/artworks?page=0').expect(400);
    });
  });

  describe('categories', () => {
    it('lets a gallery create a category', async () => {
      const res = await server()
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({ name: `Sculpture-${suffix}` })
        .expect(201);
      categoryId = res.body.data.id as string;
    });

    it('lists categories publicly', async () => {
      const res = await server().get('/api/v1/categories').expect(200);
      expect(
        res.body.data.some(
          (category: { name: string }) =>
            category.name === `Sculpture-${suffix}`,
        ),
      ).toBe(true);
    });

    it('attaches the category to an artwork owned by the gallery', async () => {
      const res = await server()
        .post(`/api/v1/artworks/${exhibitedArtworkId}/categories`)
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({ categoryId })
        .expect(201);
      expect(
        res.body.data.categories.some(
          (category: { id: string }) => category.id === categoryId,
        ),
      ).toBe(true);
    });
  });

  describe('exhibitions lifecycle', () => {
    it('rejects an exhibition created with zero artworks', async () => {
      await server()
        .post('/api/v1/exhibitions')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          title: `Empty Show ${suffix}`,
          startDate: '2026-09-01',
          endDate: '2026-09-30',
          artworkIds: [],
        })
        .expect(400);
    });

    it('creates an exhibition with one artwork', async () => {
      const res = await server()
        .post('/api/v1/exhibitions')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          title: `Impressionist Autumn ${suffix}`,
          location: 'Paris',
          startDate: '2026-09-01',
          endDate: '2026-09-30',
          artworkIds: [exhibitedArtworkId],
        })
        .expect(201);
      exhibitionId = res.body.data.id as string;
    });

    it('starting the exhibition puts its artworks ON_LOAN, which blocks sales', async () => {
      await server()
        .patch(`/api/v1/exhibitions/${exhibitionId}/start`)
        .set('Authorization', `Bearer ${galleryToken}`)
        .expect(200);

      const saleRes = await server()
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artworkId: exhibitedArtworkId,
          buyer: 'Jean Dupont',
          buyerContact: 'jean@test.com',
          salePrice: 2500,
        })
        .expect(422);
      expect(saleRes.body.rule).toBe('ARTWORK_ON_LOAN');
    });

    it('closing the exhibition returns its artworks to AVAILABLE', async () => {
      await server()
        .patch(`/api/v1/exhibitions/${exhibitionId}/close`)
        .set('Authorization', `Bearer ${galleryToken}`)
        .expect(200);

      const res = await server()
        .get(`/api/v1/artworks/${exhibitedArtworkId}`)
        .expect(200);
      expect(res.body.data.status).toBe('available');
    });
  });

  describe('loans lifecycle', () => {
    it('refuses a loan from a gallery to itself', async () => {
      await server()
        .post('/api/v1/loans')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artworkId: exhibitedArtworkId,
          borrowerGalleryId: galleryUserId,
          startDate: '2026-10-01',
          expectedReturnDate: '2026-10-31',
        })
        .expect(400);
    });

    it('loans an artwork to another gallery and flags it ON_LOAN', async () => {
      const res = await server()
        .post('/api/v1/loans')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artworkId: exhibitedArtworkId,
          borrowerGalleryId: borrowerGalleryUserId,
          purpose: 'Temporary exhibition loan',
          startDate: '2026-10-01',
          expectedReturnDate: '2026-10-31',
          conditions: 'Climate-controlled transport required',
        })
        .expect(201);
      loanId = res.body.data.id as string;
      expect(res.body.data.artwork.status).toBe('on_loan');
    });

    it('refuses to loan an artwork that is already on loan', async () => {
      const res = await server()
        .post('/api/v1/loans')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artworkId: exhibitedArtworkId,
          borrowerGalleryId: borrowerGalleryUserId,
          startDate: '2026-11-01',
          expectedReturnDate: '2026-11-30',
        })
        .expect(422);
      expect(res.body.rule).toBe('ARTWORK_NOT_AVAILABLE');
    });

    it('lists the loan for the lending gallery', async () => {
      const res = await server()
        .get('/api/v1/loans')
        .set('Authorization', `Bearer ${galleryToken}`)
        .expect(200);
      expect(
        res.body.data.some((loan: { id: string }) => loan.id === loanId),
      ).toBe(true);
    });

    it('returning the loan makes the artwork AVAILABLE again', async () => {
      const res = await server()
        .patch(`/api/v1/loans/${loanId}/return`)
        .set('Authorization', `Bearer ${galleryToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('returned');
      expect(res.body.data.artwork.status).toBe('available');
    });
  });

  describe('reports', () => {
    it('records a 6000€ sale in the 35% commission tier (setup for the dashboards)', async () => {
      const res = await server()
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artworkId: soldArtworkId,
          buyer: 'Marie Curie',
          buyerContact: 'marie@test.com',
          salePrice: 6000,
        })
        .expect(201);
      expect(res.body.data.commissionRate).toBe(0.35);
      expect(res.body.data.galleryCommission).toBe(2100);
      expect(res.body.data.artistAmount).toBe(3900);
    });

    it('serves the gallery dashboard with sales, top artists and turnover rate', async () => {
      const res = await server()
        .get('/api/v1/reports/dashboard/gallery')
        .set('Authorization', `Bearer ${galleryToken}`)
        .expect(200);

      expect(res.body.data.totalSales).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalRevenue).toBeGreaterThanOrEqual(2100);
      expect(res.body.data.topArtists.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.monthlySales.length).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.data.turnoverRate).toBe('number');
    });

    it('serves the artist dashboard to the owning gallery', async () => {
      const res = await server()
        .get(`/api/v1/reports/dashboard/artist/${artistId}`)
        .set('Authorization', `Bearer ${galleryToken}`)
        .expect(200);

      expect(res.body.data.totalSales).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalEarnings).toBeGreaterThanOrEqual(3900);
      expect(res.body.data.totalCommissionPaid).toBeGreaterThanOrEqual(2100);
    });

    it('restricts the admin dashboard to admins', async () => {
      await server()
        .get('/api/v1/reports/dashboard/admin')
        .set('Authorization', `Bearer ${galleryToken}`)
        .expect(403);

      const res = await server()
        .get('/api/v1/reports/dashboard/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(3);
      expect(res.body.data.totalVolume).toBeGreaterThanOrEqual(6000);
      expect(res.body.data.totalCommissions).toBeGreaterThanOrEqual(2100);
    });

    it('generates and lists an artist statement for the period', async () => {
      const generateRes = await server()
        .post('/api/v1/reports/artist-statements')
        .set('Authorization', `Bearer ${galleryToken}`)
        .send({
          artistId,
          periodStart: '2020-01-01',
          periodEnd: '2030-12-31',
        })
        .expect(201);
      expect(generateRes.body.data.totalSalesCount).toBeGreaterThanOrEqual(1);

      const listRes = await server()
        .get(`/api/v1/reports/artist-statements/artist/${artistId}`)
        .set('Authorization', `Bearer ${galleryToken}`)
        .expect(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let query: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getDataSourceToken(), useValue: { query } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('returns basic API information', () => {
      expect(appController.getApiInfo()).toEqual({
        name: 'ConsignArt API',
        version: '1.0',
        docs: '/api/docs',
      });
    });
  });

  describe('health', () => {
    it('returns ok when the database responds', async () => {
      await expect(appController.getHealth()).resolves.toEqual(
        expect.objectContaining({
          status: 'ok',
          database: 'up',
          uptime: expect.any(Number),
          timestamp: expect.any(String),
        }),
      );
      expect(query).toHaveBeenCalledWith('SELECT 1');
    });

    it('returns 503 when the database is unreachable', async () => {
      query.mockRejectedValueOnce(new Error('connection refused'));

      await expect(appController.getHealth()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});

import {
  ArgumentsHost,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { GlobalExceptionFilter } from './global-exception.filter';

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let response: MockResponse;

  const buildHost = (url = '/api/v1/artworks'): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url }),
      }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    filter = new GlobalExceptionFilter();
  });

  it('keeps the status and message of an HttpException', () => {
    filter.catch(new NotFoundException('Artwork not found'), buildHost());

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Artwork not found',
        path: '/api/v1/artworks',
        timestamp: expect.any(String),
      }),
    );
  });

  it('uses the error name provided by the HttpException response body', () => {
    filter.catch(new ForbiddenException('No access'), buildHost());

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'No access',
      }),
    );
  });

  it('maps a TypeORM QueryFailedError to 409 without leaking SQL details', () => {
    const dbError = new QueryFailedError(
      'INSERT INTO users ...',
      [],
      new Error('duplicate key value violates unique constraint'),
    );

    filter.catch(dbError, buildHost('/api/v1/auth/register'));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        error: 'ConflictError',
        message: 'Database constraint violation',
        path: '/api/v1/auth/register',
      }),
    );
  });

  it('maps an unexpected Error to a 500 with its message', () => {
    filter.catch(new Error('boom'), buildHost());

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'InternalServerError',
        message: 'boom',
      }),
    );
  });

  it('falls back to a generic 500 for non-Error values', () => {
    filter.catch('something broke', buildHost());

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });
});

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  const buildContext = (url: string, statusCode: number): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ url }),
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext;

  const buildHandler = (returnValue: unknown): CallHandler => ({
    handle: () => of(returnValue),
  });

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps the payload in a { data, meta, timestamp, statusCode } envelope', async () => {
    const context = buildContext('/api/v1/artworks/1', 200);
    const handler = buildHandler({ id: '1', title: 'Starry Night' });

    const result = await firstValueFrom(
      interceptor.intercept(context, handler),
    );

    expect(result).toEqual({
      data: { id: '1', title: 'Starry Night' },
      meta: { path: '/api/v1/artworks/1' },
      timestamp: expect.any(String),
      statusCode: 200,
    });
  });

  it('defaults data to null when the handler returns undefined', async () => {
    const context = buildContext('/api/v1/artworks/1', 204);
    const handler = buildHandler(undefined);

    const result = await firstValueFrom(
      interceptor.intercept(context, handler),
    );

    expect(result.data).toBeNull();
    expect(result.statusCode).toBe(204);
  });
});

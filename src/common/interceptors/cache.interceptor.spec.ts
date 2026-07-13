import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { CacheInterceptor } from './cache.interceptor';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;

  const buildContext = (
    method: string,
    originalUrl: string,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method, originalUrl }),
      }),
    }) as unknown as ExecutionContext;

  const buildHandler = (returnValue: unknown) => {
    const handle = jest.fn(() => of(returnValue));
    const handler: CallHandler = { handle };
    return { handler, handle };
  };

  beforeEach(() => {
    interceptor = new CacheInterceptor();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('bypasses the cache for non-GET requests', (done) => {
    const context = buildContext('POST', '/api/v1/artworks');
    const { handler, handle } = buildHandler({ id: '1' });

    interceptor.intercept(context, handler).subscribe(() => {
      expect(handle).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('calls the handler on the first GET and caches the result', (done) => {
    const context = buildContext('GET', '/api/v1/artworks');
    const { handler, handle } = buildHandler([{ id: '1' }]);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(handle).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: '1' }]);
      done();
    });
  });

  it('serves the cached response on a subsequent identical GET without calling the handler again', (done) => {
    const context = buildContext('GET', '/api/v1/artworks');
    const { handler } = buildHandler([{ id: '1' }]);

    interceptor.intercept(context, handler).subscribe(() => {
      const second = buildHandler([{ id: 'should-not-be-returned' }]);
      interceptor.intercept(context, second.handler).subscribe((result) => {
        expect(second.handle).not.toHaveBeenCalled();
        expect(result).toEqual([{ id: '1' }]);
        done();
      });
    });
  });

  it('refetches once the cache entry has expired', (done) => {
    const context = buildContext('GET', '/api/v1/artworks');
    const { handler } = buildHandler([{ id: '1' }]);

    interceptor.intercept(context, handler).subscribe(() => {
      jest.advanceTimersByTime(31_000);

      const second = buildHandler([{ id: '2' }]);
      interceptor.intercept(context, second.handler).subscribe((result) => {
        expect(second.handle).toHaveBeenCalledTimes(1);
        expect(result).toEqual([{ id: '2' }]);
        done();
      });
    });
  });

  it('caches GET requests with different URLs separately', (done) => {
    const context1 = buildContext('GET', '/api/v1/artworks');
    const context2 = buildContext('GET', '/api/v1/artworks/other-id');
    const first = buildHandler([{ id: '1' }]);
    const second = buildHandler({ id: 'other-id' });

    interceptor.intercept(context1, first.handler).subscribe(() => {
      interceptor.intercept(context2, second.handler).subscribe((result) => {
        expect(second.handle).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ id: 'other-id' });
        done();
      });
    });
  });
});

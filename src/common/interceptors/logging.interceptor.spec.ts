import { ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';

const appendFileMock = vi.fn().mockResolvedValue(undefined);
const mkdirMock = vi.fn().mockResolvedValue(undefined);

vi.mock('fs/promises', () => ({
  appendFile: (...args: unknown[]) =>
    (appendFileMock as (...a: unknown[]) => unknown)(...args),
  mkdir: (...args: unknown[]) =>
    (mkdirMock as (...a: unknown[]) => unknown)(...args),
}));

const { LoggingInterceptor, LOG_FILE } = await import('./logging.interceptor');

describe('LoggingInterceptor', () => {
  let interceptor: InstanceType<typeof LoggingInterceptor>;

  const buildContext = (
    method: string,
    url: string,
    statusCode: number,
    userId?: string,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          user: userId ? { id: userId } : undefined,
        }),
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext;

  const buildHandler = (observable: ReturnType<typeof of>): CallHandler => ({
    handle: () => observable,
  });

  beforeEach(() => {
    appendFileMock.mockClear();
    mkdirMock.mockClear();
    interceptor = new LoggingInterceptor();
  });

  it('appends a JSON log line to logs/http.log on success', async () => {
    const context = buildContext('GET', '/api/v1/artworks', 200, 'user-1');
    const handler = buildHandler(of([{ id: '1' }]));

    await firstValueFrom(interceptor.intercept(context, handler));
    await new Promise((resolve) => setImmediate(resolve));

    expect(appendFileMock).toHaveBeenCalledTimes(1);
    const [path, line] = appendFileMock.mock.calls[0] as [string, string];
    expect(path).toBe(LOG_FILE);
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      method: 'GET',
      url: '/api/v1/artworks',
      status: 200,
      userId: 'user-1',
    });
    expect(typeof parsed.timestamp).toBe('string');
  });

  it('logs anonymous when no user is attached to the request', async () => {
    const context = buildContext('GET', '/api/v1/artworks', 200);
    const handler = buildHandler(of([]));

    await firstValueFrom(interceptor.intercept(context, handler));
    await new Promise((resolve) => setImmediate(resolve));

    const [, line] = appendFileMock.mock.calls[0] as [string, string];
    expect(JSON.parse(line).userId).toBe('anonymous');
  });

  it('still logs and re-throws when the handler errors', async () => {
    const context = buildContext('POST', '/api/v1/sales', 422, 'user-2');
    const handler = buildHandler(
      throwError(() => new HttpException('Below reserve price', 422)),
    );

    await expect(
      firstValueFrom(interceptor.intercept(context, handler)),
    ).rejects.toBeInstanceOf(HttpException);
    await new Promise((resolve) => setImmediate(resolve));

    const [, line] = appendFileMock.mock.calls[0] as [string, string];
    const parsed = JSON.parse(line);
    expect(parsed.status).toBe(422);
    expect(parsed.error).toBe('Below reserve price');
  });
});

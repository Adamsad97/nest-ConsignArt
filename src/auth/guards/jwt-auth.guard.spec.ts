import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const createMockContext = (): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({}),
    }),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let baseCanActivate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);

    const basePrototype = Object.getPrototypeOf(JwtAuthGuard.prototype);
    baseCanActivate = vi
      .spyOn(basePrototype, 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    baseCanActivate.mockRestore();
  });

  it('bypasses JWT validation when the route is marked @Public()', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = createMockContext();

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(baseCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to the JWT strategy when the route is not public', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext();

    void guard.canActivate(ctx);

    expect(baseCanActivate).toHaveBeenCalledWith(ctx);
  });
});

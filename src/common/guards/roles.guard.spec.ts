import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '../../users/enums/role.enum';

const createMockContext = (
  userRole: Role | null,
  handler?: object,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { id: '1', email: 'a@b.com', role: userRole } : null,
      }),
    }),
    getHandler: () => handler ?? {},
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('allows access when no roles metadata is defined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext(Role.COLLECTOR);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role matches required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.GALLERY, Role.ADMIN]);
    const ctx = createMockContext(Role.GALLERY);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user role does not match', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.GALLERY]);
    const ctx = createMockContext(Role.COLLECTOR);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when ADMIN tries accessing GALLERY-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.GALLERY]);
    const ctx = createMockContext(Role.ADMIN);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows ADMIN when ADMIN is in the required roles list', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.GALLERY, Role.ADMIN]);
    const ctx = createMockContext(Role.ADMIN);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { OwnershipGuard } from './ownership.guard';
import { Role } from '../../users/enums/role.enum';

describe('OwnershipGuard', () => {
  const mockArtworksService = { findOne: jest.fn() };
  let guard: OwnershipGuard;

  const buildContext = (user: unknown, params: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new OwnershipGuard(mockArtworksService as any);
  });

  it('throws when there is no authenticated user', async () => {
    const context = buildContext(undefined, { id: 'artwork-1' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows admins regardless of ownership', async () => {
    const context = buildContext(
      { id: 'admin-1', role: Role.ADMIN },
      { id: 'artwork-1' },
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(mockArtworksService.findOne).not.toHaveBeenCalled();
  });

  it('allows the gallery that owns the artwork', async () => {
    mockArtworksService.findOne.mockResolvedValue({
      id: 'artwork-1',
      gallery: { id: 'gallery-1' },
    });
    const context = buildContext(
      { id: 'gallery-1', role: Role.GALLERY },
      { id: 'artwork-1' },
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a gallery that does not own the artwork', async () => {
    mockArtworksService.findOne.mockResolvedValue({
      id: 'artwork-1',
      gallery: { id: 'gallery-1' },
    });
    const context = buildContext(
      { id: 'gallery-2', role: Role.GALLERY },
      { id: 'artwork-1' },
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

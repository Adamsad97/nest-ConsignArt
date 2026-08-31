import { Repository } from 'typeorm';
import { findMaybePaginated } from './paginate';

interface FakeEntity {
  id: string;
}

describe('findMaybePaginated', () => {
  let find: ReturnType<typeof vi.fn>;
  let findAndCount: ReturnType<typeof vi.fn>;
  let repository: Repository<FakeEntity>;

  beforeEach(() => {
    find = vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    findAndCount = vi.fn().mockResolvedValue([[{ id: 'a' }], 41]);
    repository = { find, findAndCount } as unknown as Repository<FakeEntity>;
  });

  it('returns the plain array when no pagination is requested', async () => {
    const result = await findMaybePaginated(repository, { where: {} });

    expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(find).toHaveBeenCalledWith({ where: {} });
    expect(findAndCount).not.toHaveBeenCalled();
  });

  it('returns a pagination envelope with skip/take when page and limit are set', async () => {
    const result = await findMaybePaginated(
      repository,
      { where: {} },
      { page: 3, limit: 10 },
    );

    expect(findAndCount).toHaveBeenCalledWith({
      where: {},
      skip: 20,
      take: 10,
    });
    expect(result).toEqual({
      items: [{ id: 'a' }],
      total: 41,
      page: 3,
      limit: 10,
      pageCount: 5,
    });
  });

  it('defaults page to 1 when only limit is provided', async () => {
    await findMaybePaginated(repository, {}, { limit: 5 });

    expect(findAndCount).toHaveBeenCalledWith({ skip: 0, take: 5 });
  });

  it('defaults limit to 20 when only page is provided', async () => {
    await findMaybePaginated(repository, {}, { page: 2 });

    expect(findAndCount).toHaveBeenCalledWith({ skip: 20, take: 20 });
  });

  it('reports pageCount 1 when there are no results', async () => {
    findAndCount.mockResolvedValue([[], 0]);

    const result = await findMaybePaginated(repository, {}, { page: 1 });

    expect(result).toEqual(expect.objectContaining({ total: 0, pageCount: 1 }));
  });
});

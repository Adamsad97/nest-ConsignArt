import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';
import { PaginationQueryDto } from './pagination-query.dto';

export const DEFAULT_PAGE_SIZE = 20;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

/**
 * List endpoints stay backward compatible: without page/limit the full
 * array is returned as before; with either parameter the result is wrapped
 * in a pagination envelope with the total count.
 */
export async function findMaybePaginated<T extends ObjectLiteral>(
  repository: Repository<T>,
  options: FindManyOptions<T>,
  pagination?: PaginationQueryDto,
): Promise<T[] | Paginated<T>> {
  if (pagination?.page === undefined && pagination?.limit === undefined) {
    return repository.find(options);
  }

  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? DEFAULT_PAGE_SIZE;

  const [items, total] = await repository.findAndCount({
    ...options,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    items,
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  };
}

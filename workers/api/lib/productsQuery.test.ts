// workers/api/lib/productsQuery.test.ts
import { describe, it, expect } from 'vitest';
import { buildProductsQuery, DEFAULT_LIMIT, MAX_LIMIT } from './productsQuery';

describe('buildProductsQuery', () => {
  it('defaults to no filters, price ascending, first page', () => {
    const q = buildProductsQuery({});
    expect(q.where).toBe('1=1');
    expect(q.params).toEqual([]);
    expect(q.order).toBe('price_vnd ASC');
    expect(q.limit).toBe(DEFAULT_LIMIT);
    expect(q.offset).toBe(0);
  });

  it('numbers every placeholder sequentially so params are never reused', () => {
    const q = buildProductsQuery({
      category: 'cpu',
      brand: 'Intel',
      tier: 'mid',
      minPrice: '1000000',
      maxPrice: '5000000',
      search: 'i5',
    });
    expect(q.where).toBe(
      '1=1 AND category = ?1 AND brand = ?2 AND tier = ?3' +
        ' AND price_vnd >= ?4 AND price_vnd <= ?5' +
        ' AND (brand LIKE ?6 OR model LIKE ?7)'
    );
    expect(q.params).toEqual([
      'cpu',
      'Intel',
      'mid',
      1000000,
      5000000,
      '%i5%',
      '%i5%',
    ]);
  });

  it('applies only the filters that are present', () => {
    const q = buildProductsQuery({ brand: 'AMD', maxPrice: '9000000' });
    expect(q.where).toBe('1=1 AND brand = ?1 AND price_vnd <= ?2');
    expect(q.params).toEqual(['AMD', 9000000]);
  });

  it('ignores empty-string filters', () => {
    const q = buildProductsQuery({ category: '', search: '', minPrice: '' });
    expect(q.where).toBe('1=1');
    expect(q.params).toEqual([]);
  });

  it('skips non-numeric prices instead of emitting a broken query', () => {
    const q = buildProductsQuery({ minPrice: 'abc', maxPrice: '' });
    expect(q.where).toBe('1=1');
    expect(q.params).toEqual([]);
  });

  it('maps sort values to a whitelisted ORDER BY', () => {
    expect(buildProductsQuery({ sort: 'price_asc' }).order).toBe('price_vnd ASC');
    expect(buildProductsQuery({ sort: 'price_desc' }).order).toBe('price_vnd DESC');
    expect(buildProductsQuery({ sort: 'newest' }).order).toBe('price_updated_at DESC');
    expect(buildProductsQuery({ sort: 'rating' }).order).toBe('rating DESC');
  });

  it('falls back to price ascending for unknown sort values (no SQL injection)', () => {
    expect(buildProductsQuery({}).order).toBe('price_vnd ASC');
    expect(
      buildProductsQuery({ sort: 'price_vnd; DROP TABLE products' }).order
    ).toBe('price_vnd ASC');
  });

  it('computes offset from page and limit', () => {
    const q = buildProductsQuery({ page: '3', limit: '50' });
    expect(q.limit).toBe(50);
    expect(q.offset).toBe(100);
  });

  it('falls back to defaults for invalid pagination', () => {
    expect(buildProductsQuery({ page: 'abc', limit: 'xyz' })).toMatchObject({
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
    expect(buildProductsQuery({ page: '0', limit: '0' })).toMatchObject({
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
    expect(buildProductsQuery({ page: '-2' })).toMatchObject({ offset: 0 });
  });

  it('clamps limit to MAX_LIMIT', () => {
    expect(buildProductsQuery({ limit: '9999' }).limit).toBe(MAX_LIMIT);
    expect(buildProductsQuery({ page: '2', limit: String(MAX_LIMIT) })).toMatchObject({
      limit: MAX_LIMIT,
      offset: MAX_LIMIT,
    });
  });
});

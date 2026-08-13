import { describe, expect, it } from 'vitest';
import { productPathFromRedirect, validateDeviceCode } from './deviceLink';

describe('deviceLink', () => {
  it('accepts a normal stock code and rejects path injection', () => {
    expect(validateDeviceCode('DD00004')).toBe('DD00004');
    expect(validateDeviceCode('../admin')).toBeNull();
  });

  it('keeps the exact variant returned by the catalog backend', () => {
    const oldHost = 'https://ddmobile-website-frontend-main.vercel.app';
    const location = `${oldHost}/products/product-17?variant=variant-blue-256`;
    expect(productPathFromRedirect('DD00004', location))
      .toBe('/products/product-17?variant=variant-blue-256');
  });

  it('falls back safely when the upstream location is missing or unexpected', () => {
    expect(productPathFromRedirect('DD00004', null)).toBe('/products/DD00004');
    expect(productPathFromRedirect('DD00004', 'https://evil.example/login')).toBe('/products/DD00004');
  });
});

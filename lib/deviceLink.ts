const SAFE_DEVICE_CODE = /^[A-Za-z0-9-]{1,64}$/;

export function validateDeviceCode(value: string): string | null {
  const code = value.trim();
  return SAFE_DEVICE_CODE.test(code) ? code : null;
}

export function fallbackProductPath(code: string): string {
  return `/products/${encodeURIComponent(code)}`;
}

export function productPathFromRedirect(code: string, location: string | null): string {
  if (!location) return fallbackProductPath(code);
  try {
    const destination = new URL(location);
    if (!destination.pathname.startsWith('/products/')) return fallbackProductPath(code);
    return `${destination.pathname}${destination.search}`;
  } catch {
    return fallbackProductPath(code);
  }
}

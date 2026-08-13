import { NextRequest, NextResponse } from 'next/server';
import {
  fallbackProductPath,
  productPathFromRedirect,
  validateDeviceCode,
} from '@/lib/deviceLink';

const DEVICE_LINK_BACKEND = (
  process.env.DEVICE_LINK_BACKEND_URL || 'https://ddmobilewebsite.fourwheel.in.th'
).replace(/\/+$/, '');

interface RouteContext {
  params: Promise<{ code: string }>;
}

async function resolveProductPath(code: string): Promise<string> {
  try {
    const response = await fetch(`${DEVICE_LINK_BACKEND}/d/${encodeURIComponent(code)}`, {
      cache: 'no-store',
      redirect: 'manual',
    });
    return productPathFromRedirect(code, response.headers.get('location'));
  } catch {
    return fallbackProductPath(code);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const code = validateDeviceCode((await context.params).code);
  const path = code ? await resolveProductPath(code) : '/products';
  return NextResponse.redirect(new URL(path, request.nextUrl.origin), 302);
}

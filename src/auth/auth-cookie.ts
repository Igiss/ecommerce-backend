import { CookieOptions, Request, Response } from 'express';

export const AUTH_COOKIE_NAME = 'access_token';

export function getAuthCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  };
}

export function setAuthCookie(
  response: Response,
  accessToken: string,
  isProduction: boolean,
): void {
  response.cookie(AUTH_COOKIE_NAME, accessToken, getAuthCookieOptions(isProduction));
}

export function clearAuthCookie(response: Response, isProduction: boolean): void {
  response.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions(isProduction));
}

export function extractAuthCookie(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (rawName === AUTH_COOKIE_NAME) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

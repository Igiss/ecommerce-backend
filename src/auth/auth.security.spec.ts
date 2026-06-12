import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Role } from '../common/enums/role.enum';
import { AuthController } from './auth.controller';
import { AUTH_COOKIE_NAME, extractAuthCookie } from './auth-cookie';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';

function canActivate(requiredRole: Role, user: JwtPayload): boolean {
  const reflector = {
    getAllAndOverride: () => [requiredRole],
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
  return guard.canActivate(context);
}

describe('Authentication and role security', () => {
  const activeUser: JwtPayload = {
    sub: 'user-id',
    email: 'user@example.com',
    role: Role.User,
    status: 'active',
  };
  const activeOwner: JwtPayload = {
    sub: 'owner-id',
    email: 'owner@example.com',
    role: Role.Owner,
    status: 'active',
  };

  it('does not allow a user to access admin or owner APIs', () => {
    assert.equal(canActivate(Role.Admin, activeUser), false);
    assert.equal(canActivate(Role.Owner, activeUser), false);
  });

  it('does not allow an owner to access admin APIs', () => {
    assert.equal(canActivate(Role.Admin, activeOwner), false);
  });

  it('does not allow pending or blocked owners to access owner APIs', () => {
    assert.equal(canActivate(Role.Owner, { ...activeOwner, status: 'pending' }), false);
    assert.equal(canActivate(Role.Owner, { ...activeOwner, status: 'blocked' }), false);
  });

  it('extracts cookie tokens before Passport validates the JWT', () => {
    const request = {
      headers: { cookie: `theme=dark; ${AUTH_COOKIE_NAME}=cookie.jwt.value` },
    } as Request;
    assert.equal(extractAuthCookie(request), 'cookie.jwt.value');
  });

  it('login and register set the cookie without returning the token', async () => {
    const cookieValues: string[] = [];
    const authService = {
      login: async () => ({
        accessToken: 'login-token',
        user: { id: 'user-id', email: 'user@example.com' },
      }),
      register: async () => ({
        accessToken: 'register-token',
        user: { id: 'user-id', email: 'user@example.com' },
      }),
    } as unknown as AuthService;
    const controller = new AuthController(
      authService,
      { get: () => 'development' } as unknown as ConfigService,
    );
    const response = {
      cookie: (_name: string, value: string) => cookieValues.push(value),
    } as unknown as Response;

    const loginResult = await controller.login(
      { email: 'user@example.com', password: 'password' },
      response,
    );
    const registerResult = await controller.register(
      {
        fullName: 'User',
        email: 'user@example.com',
        password: 'password',
      },
      response,
    );

    assert.deepEqual(cookieValues, ['login-token', 'register-token']);
    assert.equal('accessToken' in loginResult, false);
    assert.equal('accessToken' in registerResult, false);
  });

  it('Google OAuth callback sets an HttpOnly cookie and redirects without a token', async () => {
    const cookies: Array<{ name: string; value: string; options: object }> = [];
    let redirectUrl = '';
    const authService = {
      googleLogin: async () => ({
        accessToken: 'secret-token',
        user: { id: 'user-id', email: 'user@example.com' },
      }),
    } as unknown as AuthService;
    const configService = {
      get: (key: string) =>
        key === 'FRONTEND_URL' ? 'http://localhost:3001' : 'development',
    } as ConfigService;
    const controller = new AuthController(authService, configService);
    const response = {
      cookie: (name: string, value: string, options: object) => {
        cookies.push({ name, value, options });
      },
      redirect: (url: string) => {
        redirectUrl = url;
      },
    } as unknown as Response;

    await controller.googleCallback({ user: {} } as Request, response);

    assert.equal(redirectUrl, 'http://localhost:3001/auth/google/callback?success=true');
    assert.equal(redirectUrl.includes('secret-token'), false);
    assert.deepEqual(cookies[0], {
      name: AUTH_COOKIE_NAME,
      value: 'secret-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
      },
    });
  });

  it('logout clears the authentication cookie', () => {
    const cleared: Array<{ name: string; options: object }> = [];
    const controller = new AuthController(
      {} as AuthService,
      { get: () => 'production' } as unknown as ConfigService,
    );
    const response = {
      clearCookie: (name: string, options: object) => {
        cleared.push({ name, options });
      },
    } as unknown as Response;

    controller.logout(response);

    assert.deepEqual(cleared[0], {
      name: AUTH_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
      },
    });
  });
});

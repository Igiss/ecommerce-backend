import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertDatabaseUriConfigured, assertSeederAllowed } from './seed';

describe('Backend seeder safety', () => {
  it('is blocked in production', () => {
    assert.throws(
      () => assertSeederAllowed('production'),
      /Seeder is disabled/,
    );
  });

  it('is allowed outside production', () => {
    assert.doesNotThrow(() => assertSeederAllowed('development'));
  });

  it('accepts either supported MongoDB URI variable', () => {
    assert.doesNotThrow(() =>
      assertDatabaseUriConfigured('mongodb://primary', undefined),
    );
    assert.doesNotThrow(() =>
      assertDatabaseUriConfigured(undefined, 'mongodb://legacy'),
    );
  });

  it('requires a MongoDB URI', () => {
    assert.throws(
      () => assertDatabaseUriConfigured(undefined, undefined),
      /MONGODB_URI or MONGO_URI is required/,
    );
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertSeederAllowed } from './seed';

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
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidEmail } from '../index.js';

describe('isValidEmail', () => {
  it('should return true for valid emails', () => {
    assert.strictEqual(isValidEmail('test@example.com'), true);
    assert.strictEqual(isValidEmail('user.name@sub.domain.co'), true);
    assert.strictEqual(isValidEmail('user+alias@example.com'), true);
    assert.strictEqual(isValidEmail('1234567890@example.com'), true);
    assert.strictEqual(isValidEmail('email@domain-one.com'), true);
    assert.strictEqual(isValidEmail('_______@example.com'), true);
    assert.strictEqual(isValidEmail('email@domain.name'), true);
    assert.strictEqual(isValidEmail('email@domain.co.jp'), true);
    assert.strictEqual(isValidEmail('firstname.lastname@example.com'), true);
  });

  it('should return false for missing @', () => {
    assert.strictEqual(isValidEmail('testexample.com'), false);
  });

  it('should return false for missing domain', () => {
    assert.strictEqual(isValidEmail('test@'), false);
  });

  it('should return false for missing local part', () => {
    assert.strictEqual(isValidEmail('@example.com'), false);
  });

  it('should return false for multiple @ symbols', () => {
    assert.strictEqual(isValidEmail('test@@example.com'), false);
    assert.strictEqual(isValidEmail('test@sub@example.com'), false);
  });

  it('should return false for spaces', () => {
    assert.strictEqual(isValidEmail('test @example.com'), false);
    assert.strictEqual(isValidEmail('test@ example.com'), false);
    assert.strictEqual(isValidEmail(' test@example.com'), false);
    assert.strictEqual(isValidEmail('test@example.com '), false);
  });

  it('should return false for missing TLD or dot in domain', () => {
    assert.strictEqual(isValidEmail('test@example'), false);
  });

  it('should return false for empty string', () => {
    assert.strictEqual(isValidEmail(''), false);
  });

  it('should return false for double dots', () => {
    assert.strictEqual(isValidEmail('test..user@example.com'), false);
    assert.strictEqual(isValidEmail('test@example..com'), false);
  });

  it('should return false for leading/trailing dots in local part', () => {
    assert.strictEqual(isValidEmail('.test@example.com'), false);
    assert.strictEqual(isValidEmail('test.@example.com'), false);
  });
});

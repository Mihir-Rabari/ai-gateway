import bcrypt from 'bcrypt';
import type Redis from 'ioredis';
import { decryptClientSecret, verifyAppJwt, type AppJwtPayload } from '@ai-gateway/utils';
import { APP_CACHE_KEYS } from '@ai-gateway/config';
import { AppRepository } from '../repositories/appRepository.js';

export type AppAccessResult = 'allowed' | 'invalid_key' | 'forbidden';

/** TTL (seconds) for app-metadata Redis cache entries. */
const APP_CACHE_TTL_SECS = 300; // 5 minutes

export interface AppValidationServiceDeps {
  decryptSecret?: (enc: string, keyHex: string) => string;
  verifyJwt?: (token: string, secret: string) => AppJwtPayload;
  compareHash?: (plain: string, hash: string) => Promise<boolean>;
}

export class AppValidationService {
  constructor(
    private readonly appRepo: AppRepository,
    private readonly redis: Redis,
    private readonly clientSecretEncryptionKey: string | undefined,
    private readonly deps: AppValidationServiceDeps = {},
  ) {}

  private get decryptSecretFn() {
    return this.deps.decryptSecret ?? decryptClientSecret;
  }

  private get verifyJwtFn() {
    return this.deps.verifyJwt ?? verifyAppJwt;
  }

  private get compareHashFn() {
    return this.deps.compareHash ?? (bcrypt.compare as (plain: string, hash: string) => Promise<boolean>);
  }

  async validate(appId: string, appApiKey?: string, appJwt?: string): Promise<AppAccessResult> {
    // ── JWT-based app authentication ──────────────────────────────────────
    // When the developer's app sends X-App-Token (a short-lived HS256 JWT
    // signed with their client secret), verify it using the stored encrypted
    // secret. This avoids long-lived API keys in transit.
    if (appJwt) {
      const encKey = this.clientSecretEncryptionKey;
      if (encKey) {
        try {
          // The payload is decoded before signature verification only to extract
          // the clientId needed for the DB lookup. The extracted clientId is used
          // solely as a lookup key (parameterised query); the full token is then
          // passed to verifyFn which performs the cryptographic check.
          // Any invalid JSON or missing fields are caught by the outer try/catch.
          const jwtParts = appJwt.split('.');
          if (jwtParts.length !== 3) return 'invalid_key';

          let clientId: string | undefined;
          try {
            const rawPayload = Buffer.from(jwtParts[1]!, 'base64url').toString('utf8');
            ({ clientId } = JSON.parse(rawPayload) as { clientId?: string });
          } catch {
            // Malformed base64url or JSON — reject immediately
            return 'invalid_key';
          }

          if (clientId) {
            // ── Redis cache: client secret ──────────────────────────────
            // Cache key stores the encrypted secret (or empty string when the
            // app does not exist / is inactive). This avoids a DB round-trip
            // for every JWT-authenticated AI request.
            // Fail open: any Redis error is treated as a cache miss so the
            // DB remains the authoritative fallback.
            const secretCacheKey = APP_CACHE_KEYS.clientSecret(clientId);
            let enc: string | null = null;
            let cachedSecret: string | null = null;
            try {
              cachedSecret = await this.redis.get(secretCacheKey);
            } catch {
              // Redis unavailable — fall through to DB
            }

            if (cachedSecret !== null) {
              // Empty string signals "app not found / inactive"
              enc = cachedSecret === '' ? null : cachedSecret;
            } else {
              enc = await this.appRepo.findClientSecretEncByClientId(clientId);
              try {
                await this.redis.setex(secretCacheKey, APP_CACHE_TTL_SECS, enc ?? '');
              } catch {
                // Ignore write failures; DB remains authoritative
              }
            }

            if (enc) {
              try {
                const secret = this.decryptSecretFn(enc, encKey);
                this.verifyJwtFn(appJwt, secret); // throws on invalid sig or expiry
                return 'allowed';
              } catch {
                return 'invalid_key';
              }
            }
          }
        } catch {
          return 'invalid_key';
        }
      }
      // If encryption key not configured, fall through to API-key path
    }

    // ── Legacy API-key authentication ─────────────────────────────────────
    if (appApiKey) {
      // ── Redis cache: API key hashes ─────────────────────────────────────
      // Storing hashed keys in Redis is safe because bcrypt hashes cannot be
      // reversed; the plaintext key is never written to the cache.
      // Fail open: Redis errors and malformed cache data both fall through to DB.
      const keysCacheKey = APP_CACHE_KEYS.apiKeyHashes(appId);
      let keyHashes: string[] | undefined;

      let cachedHashesRaw: string | null = null;
      try {
        cachedHashesRaw = await this.redis.get(keysCacheKey);
      } catch {
        // Redis unavailable — treat as cache miss
      }

      if (cachedHashesRaw !== null) {
        let evictBadEntry = false;
        try {
          const parsed: unknown = JSON.parse(cachedHashesRaw);
          if (Array.isArray(parsed) && parsed.every((item): item is string => typeof item === 'string')) {
            keyHashes = parsed;
          } else {
            evictBadEntry = true; // Unexpected shape
          }
        } catch {
          evictBadEntry = true; // Malformed JSON
        }
        if (evictBadEntry) {
          // Evict the corrupt entry so the next request gets a fresh DB refresh
          try { await this.redis.del(keysCacheKey); } catch { /* ignore */ }
        }
      }

      if (keyHashes === undefined) {
        keyHashes = await this.appRepo.findApiKeyHashesByAppId(appId);
        try {
          await this.redis.setex(keysCacheKey, APP_CACHE_TTL_SECS, JSON.stringify(keyHashes));
        } catch {
          // Ignore write failures; DB remains authoritative
        }
      }

      for (const keyHash of keyHashes) {
        if (await this.compareHashFn(appApiKey, keyHash)) {
          return 'allowed';
        }
      }

      return 'invalid_key';
    }

    // ── Redis cache: basic app active status ─────────────────────────────
    // Fail open: Redis errors fall through to DB.
    const activeCacheKey = APP_CACHE_KEYS.activeStatus(appId);
    let cachedActive: string | null = null;
    try {
      cachedActive = await this.redis.get(activeCacheKey);
    } catch {
      // Redis unavailable — fall through to DB
    }

    if (cachedActive === '1') return 'allowed';
    if (cachedActive === '0') return 'forbidden';
    // Unexpected / missing cache value: fall through to DB

    const isActive = await this.appRepo.isAppActive(appId);
    try {
      await this.redis.setex(activeCacheKey, APP_CACHE_TTL_SECS, isActive ? '1' : '0');
    } catch {
      // Ignore write failures; DB remains authoritative
    }
    return isActive ? 'allowed' : 'forbidden';
  }
}

import { GatewayError } from '@ai-gateway/utils';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5. */
  failureThreshold?: number;
  /** Milliseconds to wait in the open state before trying one probe call. Default: 30_000. */
  resetTimeoutMs?: number;
  /** Human-readable service name used in error messages. */
  serviceName?: string;
}

/**
 * A simple in-process circuit breaker.
 *
 * States:
 *   closed    – requests pass through; failures are counted.
 *   open      – all calls fail fast with GATEWAY_004; opens after failureThreshold failures.
 *   half-open – exactly one probe call is allowed after resetTimeoutMs; success → closed,
 *               failure → open; all other concurrent callers in half-open are rejected.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'closed';
  /** True while a single probe call is executing in the half-open state. */
  private probeInFlight = false;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly serviceName: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.serviceName = options.serviceName ?? 'upstream service';
  }

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Track whether this specific invocation is the single half-open probe call.
    let isProbe = false;

    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        // Transition to half-open and atomically claim the probe slot.
        // JavaScript is single-threaded, so no other caller can preempt between
        // the state assignment and setting probeInFlight.
        this.state = 'half-open';
        this.probeInFlight = true;
        isProbe = true;
      } else {
        throw new GatewayError(
          'GATEWAY_004',
          `${this.serviceName} is temporarily unavailable`,
          503,
        );
      }
    }

    // Reject concurrent callers that arrive while a probe is already running.
    if (this.state === 'half-open' && !isProbe) {
      throw new GatewayError(
        'GATEWAY_004',
        `${this.serviceName} is temporarily unavailable`,
        503,
      );
    }

    try {
      const result = await fn();
      // Success: close the circuit (or reset the failure counter in the closed state).
      if (isProbe) {
        this.reset();
      } else {
        // Reset the failure counter on every successful call so that occasional
        // failures in a mostly-healthy service do not accumulate and open the circuit.
        this.failures = 0;
      }
      return result;
    } catch (err) {
      if (isProbe) {
        // Probe failed: re-open the circuit and restart the reset timer.
        this.state = 'open';
        this.lastFailureTime = Date.now();
      } else {
        this.recordFailure();
      }
      throw err;
    } finally {
      if (isProbe) {
        this.probeInFlight = false;
      }
    }
  }

  private recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
  }
}

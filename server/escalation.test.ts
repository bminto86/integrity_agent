import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ─── Token Security Tests ───────────────────────────────────────────────────

describe("Escalation Engine — Token Security", () => {
  function hashToken(raw: string): string {
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  function generatePortalToken(): { raw: string; hash: string; suffix: string } {
    const raw = crypto.randomBytes(32).toString("base64url");
    const hash = hashToken(raw);
    const suffix = raw.slice(-8);
    return { raw, hash, suffix };
  }

  it("generates unique tokens each time", () => {
    const t1 = generatePortalToken();
    const t2 = generatePortalToken();
    expect(t1.raw).not.toBe(t2.raw);
    expect(t1.hash).not.toBe(t2.hash);
    expect(t1.suffix).not.toBe(t2.suffix);
  });

  it("produces URL-safe base64 tokens", () => {
    const { raw } = generatePortalToken();
    // base64url should not contain +, /, or =
    expect(raw).not.toMatch(/[+/=]/);
    expect(raw.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes to SHA-256 hex (64 chars)", () => {
    const { hash } = generatePortalToken();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("suffix is last 8 chars of raw token", () => {
    const { raw, suffix } = generatePortalToken();
    expect(suffix).toBe(raw.slice(-8));
    expect(suffix.length).toBe(8);
  });

  it("same raw token always produces same hash", () => {
    const { raw, hash } = generatePortalToken();
    expect(hashToken(raw)).toBe(hash);
    expect(hashToken(raw)).toBe(hash);
  });

  it("different raw tokens produce different hashes", () => {
    const t1 = generatePortalToken();
    const t2 = generatePortalToken();
    expect(hashToken(t1.raw)).not.toBe(hashToken(t2.raw));
  });
});

// ─── Rate Limiter Tests ─────────────────────────────────────────────────────

describe("Escalation Engine — Rate Limiter", () => {
  const rateLimitMap = new Map<string, number[]>();
  const RATE_LIMIT_WINDOW_MS = 60_000;
  const RATE_LIMIT_MAX_REQUESTS = 30;

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return false;
    recent.push(now);
    rateLimitMap.set(ip, recent);
    return true;
  }

  beforeEach(() => {
    rateLimitMap.clear();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(checkRateLimit("192.168.1.1")).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit("192.168.1.2");
    }
    expect(checkRateLimit("192.168.1.2")).toBe(false);
  });

  it("tracks IPs independently", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit("10.0.0.1");
    }
    expect(checkRateLimit("10.0.0.1")).toBe(false);
    expect(checkRateLimit("10.0.0.2")).toBe(true);
  });
});

// ─── Condition Evaluation Tests ─────────────────────────────────────────────

describe("Escalation Engine — Condition Evaluation", () => {
  type Condition = { metric: string; operator: string; threshold: number };

  function evaluateCondition(cond: Condition, value: number): boolean {
    switch (cond.operator) {
      case "lt": return value < cond.threshold;
      case "lte": return value <= cond.threshold;
      case "gt": return value > cond.threshold;
      case "gte": return value >= cond.threshold;
      case "eq": return value === cond.threshold;
      default: return false;
    }
  }

  function evaluateConditions(
    conditions: Condition[],
    values: Record<string, number>,
    logic: "and" | "or"
  ): boolean {
    const results = conditions.map(c => evaluateCondition(c, values[c.metric] ?? 0));
    return logic === "and" ? results.every(Boolean) : results.some(Boolean);
  }

  it("evaluates 'lt' correctly", () => {
    expect(evaluateCondition({ metric: "accuracyRate", operator: "lt", threshold: 90 }, 85)).toBe(true);
    expect(evaluateCondition({ metric: "accuracyRate", operator: "lt", threshold: 90 }, 90)).toBe(false);
    expect(evaluateCondition({ metric: "accuracyRate", operator: "lt", threshold: 90 }, 95)).toBe(false);
  });

  it("evaluates 'gt' correctly", () => {
    expect(evaluateCondition({ metric: "responseTimeHours", operator: "gt", threshold: 24 }, 30)).toBe(true);
    expect(evaluateCondition({ metric: "responseTimeHours", operator: "gt", threshold: 24 }, 24)).toBe(false);
  });

  it("evaluates 'eq' correctly", () => {
    expect(evaluateCondition({ metric: "qualityScore", operator: "eq", threshold: 100 }, 100)).toBe(true);
    expect(evaluateCondition({ metric: "qualityScore", operator: "eq", threshold: 100 }, 99)).toBe(false);
  });

  it("evaluates AND logic: all must pass", () => {
    const conditions: Condition[] = [
      { metric: "accuracyRate", operator: "lt", threshold: 90 },
      { metric: "throughput", operator: "lt", threshold: 100 },
    ];
    const values = { accuracyRate: 85, throughput: 80 };
    expect(evaluateConditions(conditions, values, "and")).toBe(true);

    const values2 = { accuracyRate: 85, throughput: 120 };
    expect(evaluateConditions(conditions, values2, "and")).toBe(false);
  });

  it("evaluates OR logic: any must pass", () => {
    const conditions: Condition[] = [
      { metric: "accuracyRate", operator: "lt", threshold: 90 },
      { metric: "throughput", operator: "lt", threshold: 100 },
    ];
    const values = { accuracyRate: 95, throughput: 80 };
    expect(evaluateConditions(conditions, values, "or")).toBe(true);

    const values2 = { accuracyRate: 95, throughput: 120 };
    expect(evaluateConditions(conditions, values2, "or")).toBe(false);
  });

  it("handles missing metrics gracefully", () => {
    const conditions: Condition[] = [
      { metric: "unknownMetric", operator: "lt", threshold: 50 },
    ];
    expect(evaluateConditions(conditions, {}, "and")).toBe(true); // 0 < 50
  });
});

// ─── Case Reference Generation Tests ────────────────────────────────────────

describe("Escalation Engine — Case Reference", () => {
  function generateCaseRef(count: number): string {
    const year = new Date().getFullYear();
    return `ESC-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  it("generates sequential case references", () => {
    expect(generateCaseRef(0)).toBe("ESC-2026-0001");
    expect(generateCaseRef(1)).toBe("ESC-2026-0002");
    expect(generateCaseRef(99)).toBe("ESC-2026-0100");
    expect(generateCaseRef(9999)).toBe("ESC-2026-10000");
  });

  it("includes current year", () => {
    const ref = generateCaseRef(0);
    expect(ref).toContain("2026");
  });
});

// ─── IP Allowlist Tests ─────────────────────────────────────────────────────

describe("Escalation Engine — IP Allowlist", () => {
  function isIpAllowed(ip: string, allowlist: string[]): boolean {
    if (allowlist.length === 0) return true;
    return allowlist.some(allowed => {
      if (allowed.includes("/")) {
        return ip.startsWith(allowed.split("/")[0].replace(/\.\d+$/, ""));
      }
      return ip === allowed;
    });
  }

  it("allows any IP when allowlist is empty", () => {
    expect(isIpAllowed("1.2.3.4", [])).toBe(true);
  });

  it("allows exact IP match", () => {
    expect(isIpAllowed("10.0.0.1", ["10.0.0.1"])).toBe(true);
    expect(isIpAllowed("10.0.0.2", ["10.0.0.1"])).toBe(false);
  });

  it("allows CIDR prefix match", () => {
    expect(isIpAllowed("192.168.1.50", ["192.168.1.0/24"])).toBe(true);
    expect(isIpAllowed("192.168.2.50", ["192.168.1.0/24"])).toBe(false);
  });

  it("supports multiple allowlist entries", () => {
    const list = ["10.0.0.1", "192.168.1.0/24"];
    expect(isIpAllowed("10.0.0.1", list)).toBe(true);
    expect(isIpAllowed("192.168.1.99", list)).toBe(true);
    expect(isIpAllowed("172.16.0.1", list)).toBe(false);
  });
});

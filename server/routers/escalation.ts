import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { notifyOwner } from "../_core/notification";
import crypto from "crypto";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Hash a raw token using SHA-256 */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generate a cryptographically secure portal token */
function generatePortalToken(): { raw: string; hash: string; suffix: string } {
  const raw = crypto.randomBytes(32).toString("base64url"); // 43 chars, URL-safe
  const hash = hashToken(raw);
  const suffix = raw.slice(-8);
  return { raw, hash, suffix };
}

/** Simple rate limiter: in-memory map of IP → timestamps */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// ─── Condition Schemas ──────────────────────────────────────────────────────

const conditionSchema = z.object({
  metric: z.enum(["accuracyRate", "throughput", "responseTimeHours", "qualityScore", "falsePositiveRate", "falseNegativeRate", "escalationRate", "utilizationRate"]),
  operator: z.enum(["lt", "lte", "gt", "gte", "eq"]),
  threshold: z.number(),
});

// ─── Escalation Router ─────────────────────────────────────────────────────

export const escalationRouter = router({

  // ─── Rules CRUD ─────────────────────────────────────────────────────
  rules: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listEscalationRules(ctx.user.id);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getEscalationRule(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      conditionLogic: z.enum(["and", "or"]).default("and"),
      conditions: z.array(conditionSchema).min(1),
      severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
      responseDeadlineHours: z.number().min(1).max(720).default(48),
      followUpIntervalHours: z.number().min(1).max(168).default(24),
      maxFollowUps: z.number().min(0).max(10).default(3),
      cooldownHours: z.number().min(0).max(720).default(24),
      vendorScope: z.array(z.number()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { vendorScope, ...rest } = input;
      return db.createEscalationRule({
        ...rest,
        conditions: rest.conditions as any,
        vendorScope: vendorScope ? (vendorScope as any) : null,
        createdBy: ctx.user.id,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      conditionLogic: z.enum(["and", "or"]).optional(),
      conditions: z.array(conditionSchema).min(1).optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      responseDeadlineHours: z.number().min(1).max(720).optional(),
      followUpIntervalHours: z.number().min(1).max(168).optional(),
      maxFollowUps: z.number().min(0).max(10).optional(),
      cooldownHours: z.number().min(0).max(720).optional(),
      isActive: z.boolean().optional(),
      vendorScope: z.array(z.number()).optional(),
    })).mutation(async ({ input }) => {
      const { id, vendorScope, conditions, ...rest } = input;
      const data: any = { ...rest };
      if (conditions) data.conditions = conditions;
      if (vendorScope !== undefined) data.vendorScope = vendorScope;
      await db.updateEscalationRule(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteEscalationRule(input.id);
      return { success: true };
    }),

    // Evaluate all active rules against current metrics
    evaluate: protectedProcedure.mutation(async ({ ctx }) => {
      const rules = await db.listEscalationRules(ctx.user.id);
      const activeRules = rules.filter(r => r.isActive);
      const allVendors = await db.listVendors();
      const triggered: Array<{ ruleId: number; ruleName: string; vendorId: number; vendorName: string; caseRef: string }> = [];

      for (const rule of activeRules) {
        const conditions = rule.conditions as Array<{ metric: string; operator: string; threshold: number }>;
        const vendorScope = rule.vendorScope as number[] | null;
        const targetVendors = vendorScope
          ? allVendors.filter(v => vendorScope.includes(v.id))
          : allVendors.filter(v => v.contractStatus === "active");

        for (const vendor of targetVendors) {
          // Check cooldown: skip if a case was recently created for this rule + vendor
          const existingCases = await db.listEscalationCases({ vendorId: vendor.id, limit: 5 });
          const recentCase = existingCases.find(c =>
            c.ruleId === rule.id &&
            c.createdAt &&
            (Date.now() - new Date(c.createdAt).getTime()) < (rule.cooldownHours ?? 24) * 3600_000
          );
          if (recentCase) continue;

          // Get latest metrics for this vendor
          const metrics = await db.getVendorMetrics(vendor.id);
          if (metrics.length === 0) continue;
          const latest = metrics[metrics.length - 1];

          // Evaluate conditions
          const results = conditions.map(cond => {
            const value = (latest as any)[cond.metric];
            if (value === null || value === undefined) return false;
            const v = Number(value);
            switch (cond.operator) {
              case "lt": return v < cond.threshold;
              case "lte": return v <= cond.threshold;
              case "gt": return v > cond.threshold;
              case "gte": return v >= cond.threshold;
              case "eq": return v === cond.threshold;
              default: return false;
            }
          });

          const triggered_rule = rule.conditionLogic === "and"
            ? results.every(Boolean)
            : results.some(Boolean);

          if (!triggered_rule) continue;

          // Generate case reference and create the case
          const caseRef = await db.getNextCaseRef();
          const triggerData = conditions.map(cond => ({
            metric: cond.metric,
            operator: cond.operator,
            threshold: cond.threshold,
            actual: Number((latest as any)[cond.metric]),
          }));

          // Use AI to generate the inquiry content
          let inquiryContent = "";
          try {
            const llmResult = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `You are Mia, an operations management AI. Generate a professional, structured escalation inquiry to send to a vendor. The inquiry should:
1. Clearly state what metrics breached and by how much
2. Ask specific questions about root cause
3. Request a remediation plan with timeline
4. Be firm but professional
5. Reference the case number provided
Format in markdown.`,
                },
                {
                  role: "user",
                  content: `Generate an escalation inquiry for:
Vendor: ${vendor.name} (${vendor.region || "Global"})
Case Reference: ${caseRef}
Severity: ${rule.severity}
Rule: ${rule.name}
Trigger Data: ${JSON.stringify(triggerData)}
SLA Targets: Accuracy ${vendor.slaAccuracyTarget}%, Throughput ${vendor.slaThroughputTarget}/hr, Response Time ${vendor.slaResponseTimeTarget}hrs
Response Deadline: ${rule.responseDeadlineHours} hours`,
                },
              ],
            });
            inquiryContent = typeof llmResult.choices[0]?.message?.content === "string"
              ? llmResult.choices[0].message.content
              : "Escalation inquiry generation failed. Please review the trigger data manually.";
          } catch {
            inquiryContent = `## Escalation Notice — ${caseRef}\n\nDear ${vendor.name} team,\n\nWe have detected metric breaches that require your immediate attention.\n\n${triggerData.map(t => `- **${t.metric}**: ${t.actual} (threshold: ${t.operator} ${t.threshold})`).join("\n")}\n\nPlease provide a root cause analysis and remediation plan within ${rule.responseDeadlineHours} hours.`;
          }

          const deadline = new Date(Date.now() + (rule.responseDeadlineHours ?? 48) * 3600_000);

          const caseResult = await db.createEscalationCase({
            ruleId: rule.id,
            vendorId: vendor.id,
            caseRef,
            title: `${rule.name}: ${vendor.name}`,
            description: rule.description || undefined,
            severity: rule.severity,
            status: "awaiting_vendor",
            inquiryContent,
            triggerData: triggerData as any,
            responseDeadline: deadline,
            createdBy: ctx.user.id,
          });

          // Add timeline entry
          await db.addTimelineEntry({
            caseId: caseResult.id,
            eventType: "case_created",
            actor: "system",
            title: `Escalation case ${caseRef} created`,
            content: `Rule "${rule.name}" triggered for ${vendor.name}. Severity: ${rule.severity}. Response deadline: ${deadline.toISOString()}.`,
            metadata: { triggerData } as any,
          });

          await db.addTimelineEntry({
            caseId: caseResult.id,
            eventType: "inquiry_sent",
            actor: "mia",
            title: "Mia generated escalation inquiry",
            content: inquiryContent,
          });

          // Create notification
          await db.createNotification({
            userId: ctx.user.id,
            type: "sla_breach",
            severity: rule.severity as any,
            title: `Escalation: ${caseRef} — ${vendor.name}`,
            message: `Rule "${rule.name}" triggered. ${triggerData.map(t => `${t.metric}: ${t.actual}`).join(", ")}. Vendor response deadline: ${deadline.toLocaleString()}.`,
            actionUrl: `/escalations/${caseResult.id}`,
            relatedEntityType: "escalation",
            relatedEntityId: caseResult.id,
          });

          // Notify owner out-of-app for critical/high
          if (rule.severity === "critical" || rule.severity === "high") {
            await notifyOwner({
              title: `Escalation ${caseRef}: ${vendor.name}`,
              content: `Rule "${rule.name}" triggered a ${rule.severity} escalation for ${vendor.name}. Metrics: ${triggerData.map(t => `${t.metric}=${t.actual}`).join(", ")}.`,
            }).catch(() => {});
          }

          triggered.push({
            ruleId: rule.id,
            ruleName: rule.name,
            vendorId: vendor.id,
            vendorName: vendor.name,
            caseRef,
          });
        }
      }

      return { triggered, count: triggered.length };
    }),
  }),

  // ─── Cases CRUD & Management ────────────────────────────────────────
  cases: router({
    list: protectedProcedure.input(z.object({
      vendorId: z.number().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listEscalationCases({
        vendorId: input?.vendorId,
        status: input?.status,
        limit: input?.limit ?? 50,
      });
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getEscalationCase(input.id);
    }),
    getByRef: protectedProcedure.input(z.object({ caseRef: z.string() })).query(async ({ input }) => {
      return db.getEscalationCaseByCaseRef(input.caseRef);
    }),
    create: protectedProcedure.input(z.object({
      vendorId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
      responseDeadlineHours: z.number().default(48),
    })).mutation(async ({ ctx, input }) => {
      const caseRef = await db.getNextCaseRef();
      const vendor = await db.getVendor(input.vendorId);
      if (!vendor) throw new Error("Vendor not found");

      // Generate inquiry with AI
      let inquiryContent = "";
      try {
        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are Mia, an operations management AI. Generate a professional escalation inquiry for a vendor. Be structured, specific, and request root cause analysis with remediation plan and timeline. Format in markdown.`,
            },
            {
              role: "user",
              content: `Generate escalation inquiry for:
Vendor: ${vendor.name}
Case: ${caseRef}
Severity: ${input.severity}
Title: ${input.title}
Description: ${input.description || "Manual escalation"}
Response Deadline: ${input.responseDeadlineHours} hours`,
            },
          ],
        });
        inquiryContent = typeof llmResult.choices[0]?.message?.content === "string"
          ? llmResult.choices[0].message.content : "";
      } catch {
        inquiryContent = `## Escalation Notice — ${caseRef}\n\n${input.description || input.title}`;
      }

      const deadline = new Date(Date.now() + input.responseDeadlineHours * 3600_000);
      const result = await db.createEscalationCase({
        vendorId: input.vendorId,
        caseRef,
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: "awaiting_vendor",
        inquiryContent,
        responseDeadline: deadline,
        createdBy: ctx.user.id,
      });

      await db.addTimelineEntry({
        caseId: result.id,
        eventType: "case_created",
        actor: "user",
        title: `Manual escalation ${caseRef} created`,
        content: `${input.title}. Severity: ${input.severity}. Response deadline: ${deadline.toISOString()}.`,
      });

      return { id: result.id, caseRef };
    }),

    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["open", "awaiting_vendor", "vendor_responded", "under_review", "resolved", "closed", "auto_escalated"]),
      resolutionNotes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const data: any = { status: input.status };
      if (input.status === "resolved" || input.status === "closed") {
        data.resolvedAt = new Date();
        if (input.resolutionNotes) data.resolutionNotes = input.resolutionNotes;
      }
      await db.updateEscalationCase(input.id, data);
      await db.addTimelineEntry({
        caseId: input.id,
        eventType: "status_changed",
        actor: "user",
        title: `Status changed to ${input.status}`,
        content: input.resolutionNotes || undefined,
      });
      return { success: true };
    }),

    addNote: protectedProcedure.input(z.object({
      id: z.number(),
      note: z.string().min(1),
    })).mutation(async ({ input }) => {
      await db.addTimelineEntry({
        caseId: input.id,
        eventType: "note_added",
        actor: "user",
        title: "Note added",
        content: input.note,
      });
      return { success: true };
    }),

    timeline: protectedProcedure.input(z.object({ caseId: z.number() })).query(async ({ input }) => {
      return db.listEscalationTimeline(input.caseId);
    }),

    responses: protectedProcedure.input(z.object({ caseId: z.number() })).query(async ({ input }) => {
      return db.listVendorResponses(input.caseId);
    }),

    // Mia analysis of a case
    analyze: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const caseData = await db.getEscalationCase(input.id);
      if (!caseData) throw new Error("Case not found");

      const vendor = await db.getVendor(caseData.vendorId);
      const responses = await db.listVendorResponses(input.id);
      const timeline = await db.listEscalationTimeline(input.id);
      const historicalCases = await db.listEscalationCases({ vendorId: caseData.vendorId, limit: 10 });

      const llmResult = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are Mia, an operations management AI. Analyze this escalation case and provide a comprehensive assessment in markdown. Include:
1. **Situation Assessment**: What happened and how severe is it
2. **Vendor Response Quality**: If vendor has responded, assess completeness and credibility
3. **Pattern Analysis**: Compare with historical escalations for this vendor
4. **Risk Assessment**: What's the ongoing risk if not resolved
5. **Recommended Actions**: Specific next steps for the operations manager
Be direct, data-driven, and actionable.`,
          },
          {
            role: "user",
            content: `Analyze this escalation case:
Case: ${caseData.caseRef} — ${caseData.title}
Vendor: ${vendor?.name || "Unknown"} (${vendor?.region || "Global"})
Severity: ${caseData.severity}
Status: ${caseData.status}
Created: ${caseData.createdAt}
Trigger Data: ${JSON.stringify(caseData.triggerData)}
Inquiry: ${caseData.inquiryContent?.substring(0, 500)}
Vendor Responses (${responses.length}): ${JSON.stringify(responses.map(r => ({
  rootCause: r.rootCause?.substring(0, 200),
  remediationPlan: r.remediationPlan?.substring(0, 200),
  timeline: r.timeline,
  isAiAssisted: r.isAiAssisted,
  submittedAt: r.createdAt,
})))}
Historical Cases for this vendor: ${historicalCases.length} total, ${historicalCases.filter(c => c.status === "resolved" || c.status === "closed").length} resolved
Timeline events: ${timeline.length}`,
          },
        ],
      });

      const analysis = typeof llmResult.choices[0]?.message?.content === "string"
        ? llmResult.choices[0].message.content : "Analysis unavailable.";

      await db.updateEscalationCase(input.id, { miaAnalysis: analysis });
      await db.addTimelineEntry({
        caseId: input.id,
        eventType: "mia_analysis",
        actor: "mia",
        title: "Mia completed case analysis",
        content: analysis,
      });

      return { analysis };
    }),

    stats: protectedProcedure.query(async () => {
      return db.getEscalationStats();
    }),
  }),

  // ─── Vendor Portal Tokens ───────────────────────────────────────────
  tokens: router({
    list: protectedProcedure.input(z.object({
      vendorId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listVendorPortalTokens(input?.vendorId);
    }),
    create: protectedProcedure.input(z.object({
      vendorId: z.number(),
      label: z.string().optional(),
      expiryDays: z.number().min(1).max(365).default(90),
      ipAllowlist: z.array(z.string()).optional(),
      caseScope: z.array(z.number()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { raw, hash, suffix } = generatePortalToken();
      const expiresAt = new Date(Date.now() + input.expiryDays * 86400_000);

      const result = await db.createVendorPortalToken({
        vendorId: input.vendorId,
        tokenHash: hash,
        tokenSuffix: suffix,
        label: input.label || `Portal access for vendor ${input.vendorId}`,
        caseScope: input.caseScope ? (input.caseScope as any) : null,
        ipAllowlist: input.ipAllowlist ? (input.ipAllowlist as any) : null,
        expiresAt,
        createdBy: ctx.user.id,
      });

      // Audit log
      await db.addAuditLogEntry({
        eventCategory: "token_created",
        vendorId: input.vendorId,
        tokenId: result.id,
        details: `Token created (suffix: ...${suffix}), expires ${expiresAt.toISOString()}. IP allowlist: ${input.ipAllowlist?.join(", ") || "none"}.`,
      });

      // Return the raw token ONCE — it cannot be retrieved again
      return {
        id: result.id,
        rawToken: raw,
        suffix,
        expiresAt,
        warning: "This is the only time the full token will be shown. Store it securely.",
      };
    }),
    revoke: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.revokeVendorPortalToken(input.id);
      await db.addAuditLogEntry({
        eventCategory: "token_revoked",
        tokenId: input.id,
        details: "Token manually revoked by admin.",
      });
      return { success: true };
    }),
  }),

  // ─── Audit Log ──────────────────────────────────────────────────────
  auditLog: router({
    list: protectedProcedure.input(z.object({
      vendorId: z.number().optional(),
      tokenId: z.number().optional(),
      caseId: z.number().optional(),
      securityOnly: z.boolean().optional(),
      limit: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listAuditLog({
        vendorId: input?.vendorId,
        tokenId: input?.tokenId,
        caseId: input?.caseId,
        securityOnly: input?.securityOnly,
        limit: input?.limit ?? 100,
      });
    }),
  }),

  // ─── Public Vendor Portal API (token-authenticated, no user login) ──
  portal: router({
    /** Validate a portal token and return vendor context */
    authenticate: publicProcedure.input(z.object({
      token: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";

      // Rate limiting
      if (!checkRateLimit(ip)) {
        await db.addAuditLogEntry({
          eventCategory: "rate_limited",
          ipAddress: ip,
          isSecurityEvent: true,
          details: "Rate limit exceeded for portal authentication.",
        });
        throw new Error("Too many requests. Please try again later.");
      }

      const tokenHash = hashToken(input.token);
      const tokenRecord = await db.getVendorPortalTokenByHash(tokenHash);

      if (!tokenRecord) {
        await db.addAuditLogEntry({
          eventCategory: "invalid_token",
          ipAddress: ip,
          isSecurityEvent: true,
          details: "Invalid portal token attempted.",
        });
        throw new Error("Invalid or expired access token.");
      }

      // Check revocation
      if (tokenRecord.isRevoked) {
        await db.addAuditLogEntry({
          eventCategory: "invalid_token",
          tokenId: tokenRecord.id,
          vendorId: tokenRecord.vendorId,
          ipAddress: ip,
          isSecurityEvent: true,
          details: "Revoked token access attempted.",
        });
        throw new Error("This access token has been revoked.");
      }

      // Check expiry
      if (new Date() > new Date(tokenRecord.expiresAt)) {
        await db.addAuditLogEntry({
          eventCategory: "token_expired",
          tokenId: tokenRecord.id,
          vendorId: tokenRecord.vendorId,
          ipAddress: ip,
          isSecurityEvent: true,
          details: "Expired token access attempted.",
        });
        throw new Error("This access token has expired.");
      }

      // Check IP allowlist
      const allowlist = tokenRecord.ipAllowlist as string[] | null;
      if (allowlist && allowlist.length > 0) {
        const ipAllowed = allowlist.some(allowed => {
          if (allowed.includes("/")) {
            // CIDR check (simplified: exact prefix match for now)
            return ip.startsWith(allowed.split("/")[0].replace(/\.\d+$/, ""));
          }
          return ip === allowed;
        });
        if (!ipAllowed) {
          await db.addAuditLogEntry({
            eventCategory: "ip_blocked",
            tokenId: tokenRecord.id,
            vendorId: tokenRecord.vendorId,
            ipAddress: ip,
            isSecurityEvent: true,
            details: `IP ${ip} not in allowlist: ${allowlist.join(", ")}`,
          });
          throw new Error("Access denied from this network.");
        }
      }

      // Token is valid — record access
      await db.recordTokenAccess(tokenRecord.id);
      await db.addAuditLogEntry({
        eventCategory: "portal_accessed",
        tokenId: tokenRecord.id,
        vendorId: tokenRecord.vendorId,
        ipAddress: ip,
        userAgent: ctx.req.headers["user-agent"] || undefined,
        details: "Vendor portal access authenticated successfully.",
      });

      // Get vendor info (sanitised — no internal notes)
      const vendor = await db.getVendor(tokenRecord.vendorId);

      // Get cases scoped to this token
      const caseScope = tokenRecord.caseScope as number[] | null;
      let cases = await db.listEscalationCases({ vendorId: tokenRecord.vendorId });
      if (caseScope && caseScope.length > 0) {
        cases = cases.filter(c => caseScope.includes(c.id));
      }

      // Sanitise: only return vendor-safe data
      const sanitisedCases = cases.map(c => ({
        id: c.id,
        caseRef: c.caseRef,
        title: c.title,
        severity: c.severity,
        status: c.status,
        inquiryContent: c.inquiryContent,
        responseDeadline: c.responseDeadline,
        followUpCount: c.followUpCount,
        createdAt: c.createdAt,
      }));

      return {
        vendorId: tokenRecord.vendorId,
        vendorName: vendor?.name || "Unknown",
        tokenSuffix: tokenRecord.tokenSuffix,
        cases: sanitisedCases,
      };
    }),

    /** Get a specific case (vendor-scoped) */
    getCase: publicProcedure.input(z.object({
      token: z.string().min(1),
      caseId: z.number(),
    })).query(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) throw new Error("Too many requests.");

      const tokenHash = hashToken(input.token);
      const tokenRecord = await db.getVendorPortalTokenByHash(tokenHash);
      if (!tokenRecord || tokenRecord.isRevoked || new Date() > new Date(tokenRecord.expiresAt)) {
        throw new Error("Invalid or expired access token.");
      }

      const caseData = await db.getEscalationCase(input.caseId);
      if (!caseData || caseData.vendorId !== tokenRecord.vendorId) {
        throw new Error("Case not found.");
      }

      // Check case scope
      const caseScope = tokenRecord.caseScope as number[] | null;
      if (caseScope && !caseScope.includes(input.caseId)) {
        throw new Error("Access denied for this case.");
      }

      const responses = await db.listVendorResponses(input.caseId);
      const timeline = await db.listEscalationTimeline(input.caseId);

      // Sanitise timeline: exclude internal notes
      const vendorTimeline = timeline.filter(t =>
        ["case_created", "inquiry_sent", "vendor_responded", "follow_up_sent", "severity_escalated"].includes(t.eventType)
      );

      return {
        id: caseData.id,
        caseRef: caseData.caseRef,
        title: caseData.title,
        severity: caseData.severity,
        status: caseData.status,
        inquiryContent: caseData.inquiryContent,
        responseDeadline: caseData.responseDeadline,
        followUpCount: caseData.followUpCount,
        createdAt: caseData.createdAt,
        responses: responses.map(r => ({
          id: r.id,
          rootCause: r.rootCause,
          remediationPlan: r.remediationPlan,
          timeline: r.timeline,
          preventionMeasures: r.preventionMeasures,
          additionalNotes: r.additionalNotes,
          isAiAssisted: r.isAiAssisted,
          createdAt: r.createdAt,
        })),
        timeline: vendorTimeline.map(t => ({
          eventType: t.eventType,
          title: t.title,
          createdAt: t.createdAt,
        })),
      };
    }),

    /** Submit a vendor response */
    submitResponse: publicProcedure.input(z.object({
      token: z.string().min(1),
      caseId: z.number(),
      rootCause: z.string().min(1),
      remediationPlan: z.string().min(1),
      timeline: z.string().min(1),
      preventionMeasures: z.string().optional(),
      additionalNotes: z.string().optional(),
      isAiAssisted: z.boolean().default(false),
    })).mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) throw new Error("Too many requests.");

      const tokenHash = hashToken(input.token);
      const tokenRecord = await db.getVendorPortalTokenByHash(tokenHash);
      if (!tokenRecord || tokenRecord.isRevoked || new Date() > new Date(tokenRecord.expiresAt)) {
        throw new Error("Invalid or expired access token.");
      }

      const caseData = await db.getEscalationCase(input.caseId);
      if (!caseData || caseData.vendorId !== tokenRecord.vendorId) {
        throw new Error("Case not found.");
      }

      // Create the response
      const result = await db.createVendorResponse({
        caseId: input.caseId,
        vendorId: tokenRecord.vendorId,
        tokenId: tokenRecord.id,
        rootCause: input.rootCause,
        remediationPlan: input.remediationPlan,
        timeline: input.timeline,
        preventionMeasures: input.preventionMeasures,
        additionalNotes: input.additionalNotes,
        isAiAssisted: input.isAiAssisted,
        submitterIp: ip,
      });

      // Update case status
      await db.updateEscalationCase(input.caseId, { status: "vendor_responded" });

      // Timeline entry
      await db.addTimelineEntry({
        caseId: input.caseId,
        eventType: "vendor_responded",
        actor: "vendor",
        title: "Vendor submitted response",
        content: `Root cause: ${input.rootCause.substring(0, 200)}... Remediation: ${input.remediationPlan.substring(0, 200)}... Timeline: ${input.timeline}`,
        metadata: { responseId: result.id, isAiAssisted: input.isAiAssisted } as any,
      });

      // Audit log
      await db.addAuditLogEntry({
        eventCategory: "response_submitted",
        vendorId: tokenRecord.vendorId,
        tokenId: tokenRecord.id,
        caseId: input.caseId,
        ipAddress: ip,
        details: `Vendor response submitted for case ${caseData.caseRef}. AI-assisted: ${input.isAiAssisted}.`,
      });

      // Notify the case owner
      await db.createNotification({
        userId: caseData.createdBy,
        type: "system" as any,
        severity: "medium",
        title: `Vendor Response: ${caseData.caseRef}`,
        message: `${caseData.title} — vendor has submitted a response. Root cause: ${input.rootCause.substring(0, 100)}...`,
        actionUrl: `/escalations/${input.caseId}`,
        relatedEntityType: "escalation",
        relatedEntityId: input.caseId,
      });

      await notifyOwner({
        title: `Vendor Response Received: ${caseData.caseRef}`,
        content: `Vendor has responded to escalation ${caseData.caseRef}. Review the response in the escalation dashboard.`,
      }).catch(() => {});

      return { success: true, responseId: result.id };
    }),

    /** Vendor AI agent: get draft response suggestion */
    aiSuggest: publicProcedure.input(z.object({
      token: z.string().min(1),
      caseId: z.number(),
      vendorContext: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) throw new Error("Too many requests.");

      const tokenHash = hashToken(input.token);
      const tokenRecord = await db.getVendorPortalTokenByHash(tokenHash);
      if (!tokenRecord || tokenRecord.isRevoked || new Date() > new Date(tokenRecord.expiresAt)) {
        throw new Error("Invalid or expired access token.");
      }

      const caseData = await db.getEscalationCase(input.caseId);
      if (!caseData || caseData.vendorId !== tokenRecord.vendorId) {
        throw new Error("Case not found.");
      }

      // Check if vendor has an AI agent configured
      const agents = await db.listVendorAiAgents(tokenRecord.vendorId);
      const activeAgent = agents.find(a => a.isActive);

      const systemPrompt = activeAgent
        ? `${activeAgent.systemPrompt}\n\nKnowledge Base:\n${activeAgent.knowledgeBase || "No specific knowledge base configured."}`
        : `You are an AI assistant helping a vendor respond to an escalation inquiry from their client. Generate a professional, thorough response that addresses root cause, remediation plan, timeline, and prevention measures. Be honest and specific.`;

      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Help me draft a response to this escalation:

Inquiry:
${caseData.inquiryContent}

Trigger Data: ${JSON.stringify(caseData.triggerData)}
${input.vendorContext ? `\nOur internal context:\n${input.vendorContext}` : ""}

Please provide a structured response with:
1. Root Cause Analysis
2. Remediation Plan
3. Timeline for Resolution
4. Prevention Measures`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "vendor_response_draft",
            strict: true,
            schema: {
              type: "object",
              properties: {
                rootCause: { type: "string", description: "Root cause analysis" },
                remediationPlan: { type: "string", description: "Detailed remediation plan" },
                timeline: { type: "string", description: "Timeline for resolution" },
                preventionMeasures: { type: "string", description: "Steps to prevent recurrence" },
              },
              required: ["rootCause", "remediationPlan", "timeline", "preventionMeasures"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResult.choices[0]?.message?.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");
      return parsed;
    }),
  }),

  // ─── Vendor AI Agents (managed by internal user) ────────────────────
  vendorAgents: router({
    list: protectedProcedure.input(z.object({
      vendorId: z.number(),
    })).query(async ({ input }) => {
      return db.listVendorAiAgents(input.vendorId);
    }),
    create: protectedProcedure.input(z.object({
      vendorId: z.number(),
      name: z.string().min(1).max(255),
      systemPrompt: z.string().min(1),
      knowledgeBase: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createVendorAiAgent(input);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      systemPrompt: z.string().min(1).optional(),
      knowledgeBase: z.string().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateVendorAiAgent(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteVendorAiAgent(input.id);
      return { success: true };
    }),
  }),
});

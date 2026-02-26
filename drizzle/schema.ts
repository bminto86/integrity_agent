import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, float } from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Vendors ─────────────────────────────────────────────────────────────────
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  region: varchar("region", { length: 128 }),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contractStatus: mysqlEnum("contractStatus", ["active", "pending", "expired", "terminated"]).default("active").notNull(),
  slaAccuracyTarget: float("slaAccuracyTarget").default(95),
  slaThroughputTarget: float("slaThroughputTarget").default(100),
  slaResponseTimeTarget: float("slaResponseTimeTarget").default(24),
  headcount: int("headcount").default(0),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

// ─── Vendor Metrics (daily snapshots) ────────────────────────────────────────
export const vendorMetrics = mysqlTable("vendor_metrics", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull(),
  date: timestamp("date").notNull(),
  accuracyRate: float("accuracyRate"),
  throughput: float("throughput"),
  responseTimeHours: float("responseTimeHours"),
  qualityScore: float("qualityScore"),
  falsePositiveRate: float("falsePositiveRate"),
  falseNegativeRate: float("falseNegativeRate"),
  escalationRate: float("escalationRate"),
  utilizationRate: float("utilizationRate"),
  reviewVolume: int("reviewVolume"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VendorMetric = typeof vendorMetrics.$inferSelect;
export type InsertVendorMetric = typeof vendorMetrics.$inferInsert;

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId"),
  type: mysqlEnum("type", ["sla_breach", "quality_drop", "capacity_warning", "anomaly", "general"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  isRead: boolean("isRead").default(false).notNull(),
  isResolved: boolean("isResolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["todo", "in_progress", "blocked", "done"]).default("todo").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  category: mysqlEnum("category", ["vendor_mgmt", "quality", "workforce", "reporting", "process", "general"]).default("general").notNull(),
  assignee: varchar("assignee", { length: 255 }),
  dueDate: timestamp("dueDate"),
  vendorId: int("vendorId"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Meetings ────────────────────────────────────────────────────────────────
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  meetingType: mysqlEnum("meetingType", ["one_on_one", "team_sync", "vendor_review", "qbr", "stakeholder", "other"]).default("other").notNull(),
  attendees: text("attendees"),
  scheduledAt: timestamp("scheduledAt"),
  duration: int("duration"),
  agendaItems: text("agendaItems"),
  talkingPoints: text("talkingPoints"),
  notes: text("notes"),
  actionItems: text("actionItems"),
  summary: text("summary"),
  vendorId: int("vendorId"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  reportType: mysqlEnum("reportType", ["weekly", "monthly", "quarterly", "custom"]).default("weekly").notNull(),
  content: text("content"),
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  metrics: text("metrics"),
  insights: text("insights"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ─── Documents ───────────────────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  docType: mysqlEnum("docType", ["sop", "training", "process", "policy", "template", "other"]).default("other").notNull(),
  content: text("content"),
  version: int("version").default(1),
  status: mysqlEnum("status", ["draft", "review", "published", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Scorecards ──────────────────────────────────────────────────────────────
export const scorecards = mysqlTable("scorecards", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull(),
  period: varchar("period", { length: 64 }).notNull(),
  overallScore: float("overallScore"),
  accuracyScore: float("accuracyScore"),
  throughputScore: float("throughputScore"),
  qualityScore: float("qualityScore"),
  responseTimeScore: float("responseTimeScore"),
  commentary: text("commentary"),
  recommendations: text("recommendations"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Scorecard = typeof scorecards.$inferSelect;
export type InsertScorecard = typeof scorecards.$inferInsert;

// ─── Communications ──────────────────────────────────────────────────────────
export const communications = mysqlTable("communications", {
  id: int("id").autoincrement().primaryKey(),
  commType: mysqlEnum("commType", ["escalation", "status_update", "stakeholder_email", "vendor_comm", "program_update", "other"]).default("other").notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  content: text("content"),
  recipients: text("recipients"),
  status: mysqlEnum("status", ["draft", "sent", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = typeof communications.$inferInsert;

// ─── Workforce Plans ─────────────────────────────────────────────────────────
export const workforcePlans = mysqlTable("workforce_plans", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  vendorId: int("vendorId"),
  forecastPeriod: varchar("forecastPeriod", { length: 64 }),
  projectedVolume: int("projectedVolume"),
  recommendedHeadcount: int("recommendedHeadcount"),
  currentHeadcount: int("currentHeadcount"),
  assumptions: text("assumptions"),
  recommendations: text("recommendations"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkforcePlan = typeof workforcePlans.$inferSelect;
export type InsertWorkforcePlan = typeof workforcePlans.$inferInsert;

// ─── User Settings (avatar preference, etc.) ────────────────────────────────
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  avatarId: varchar("avatarId", { length: 64 }).default("option-2").notNull(),
  agentName: varchar("agentName", { length: 128 }).default("Mia").notNull(),
  voiceEnabled: boolean("voiceEnabled").default(true).notNull(),
  /** Response style: tone (professional, casual, friendly, direct, empathetic) */
  responseTone: varchar("responseTone", { length: 64 }).default("professional"),
  /** Response style: verbosity (concise, balanced, detailed) */
  responseVerbosity: varchar("responseVerbosity", { length: 64 }).default("balanced"),
  /** Response style: formality (formal, conversational, casual) */
  responseFormality: varchar("responseFormality", { length: 64 }).default("conversational"),
  /** Response style: personality traits (comma-separated) */
  responsePersonality: varchar("responsePersonality", { length: 500 }).default("supportive, analytical"),
  /** Response style: custom instructions (free text) */
  responseCustomInstructions: text("responseCustomInstructions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSetting = typeof userSettings.$inferSelect;
export type InsertUserSetting = typeof userSettings.$inferInsert;

// ─── Notifications ──────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "sla_breach", "task_overdue", "task_due_soon", "quality_drop",
    "capacity_warning", "scorecard_ready", "report_ready", "system", "mia_insight"
  ]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message"),
  /** Optional link to navigate to when clicked */
  actionUrl: varchar("actionUrl", { length: 500 }),
  /** Optional reference to related entity */
  relatedEntityType: varchar("relatedEntityType", { length: 64 }),
  relatedEntityId: int("relatedEntityId"),
  isRead: boolean("isRead").default(false).notNull(),
  isDismissed: boolean("isDismissed").default(false).notNull(),
  /** Whether the owner was also notified out-of-app */
  pushedToOwner: boolean("pushedToOwner").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Custom Agents ─────────────────────────────────────────────────────────
export const customAgents = mysqlTable("custom_agents", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** The agent's role / title (e.g., "SLA Compliance Specialist") */
  role: varchar("role", { length: 255 }),
  /** Short description of what this agent does */
  description: text("description"),
  /** The full system prompt that defines this agent's behaviour */
  systemPrompt: text("systemPrompt").notNull(),
  /** Area of expertise tags (comma-separated) */
  expertise: varchar("expertise", { length: 500 }),
  /** Personality traits (e.g., "analytical, direct, supportive") */
  personality: varchar("personality", { length: 500 }),
  /** Response tone (professional, casual, friendly, direct, empathetic) */
  responseTone: varchar("responseTone", { length: 64 }).default("professional"),
  /** Response verbosity (concise, balanced, detailed) */
  responseVerbosity: varchar("responseVerbosity", { length: 64 }).default("balanced"),
  /** Response formality (formal, conversational, casual) */
  responseFormality: varchar("responseFormality", { length: 64 }).default("conversational"),
  /** Custom response instructions */
  responseCustomInstructions: text("responseCustomInstructions"),
  /** Avatar ID from the shared avatar library */
  avatarId: varchar("avatarId", { length: 64 }).default("option-2").notNull(),
  /** Whether this agent has voice enabled */
  voiceEnabled: boolean("voiceEnabled").default(true).notNull(),
  /** Whether this agent is active/archived */
  isActive: boolean("isActive").default(true).notNull(),
  /** Colour accent for the agent card (hex) */
  accentColor: varchar("accentColor", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomAgent = typeof customAgents.$inferSelect;
export type InsertCustomAgent = typeof customAgents.$inferInsert;

// ─── Agent Messages (conversation history per agent) ───────────────────────
export const agentMessages = mysqlTable("agent_messages", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = typeof agentMessages.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// ESCALATION ORCHESTRATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Escalation Rules (multi-condition trigger definitions) ─────────────────
export const escalationRules = mysqlTable("escalation_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** Whether conditions are combined with AND or OR */
  conditionLogic: mysqlEnum("conditionLogic", ["and", "or"]).default("and").notNull(),
  /** JSON array of condition objects: [{metric, operator, threshold}] */
  conditions: json("conditions").notNull(),
  /** Severity assigned when this rule triggers */
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("high").notNull(),
  /** Hours before auto-escalation if no vendor response */
  responseDeadlineHours: int("responseDeadlineHours").default(48).notNull(),
  /** Hours between follow-up reminders */
  followUpIntervalHours: int("followUpIntervalHours").default(24).notNull(),
  /** Max follow-ups before auto-escalating severity */
  maxFollowUps: int("maxFollowUps").default(3).notNull(),
  /** Optional cooldown in hours to prevent duplicate triggers */
  cooldownHours: int("cooldownHours").default(24).notNull(),
  /** Whether this rule is active */
  isActive: boolean("isActive").default(true).notNull(),
  /** Optional: only apply to specific vendor IDs (JSON array), null = all vendors */
  vendorScope: json("vendorScope"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscalationRule = typeof escalationRules.$inferSelect;
export type InsertEscalationRule = typeof escalationRules.$inferInsert;

// ─── Escalation Cases (active escalation instances) ─────────────────────────
export const escalationCases = mysqlTable("escalation_cases", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to the rule that triggered this case */
  ruleId: int("ruleId"),
  vendorId: int("vendorId").notNull(),
  /** Human-readable case reference e.g. ESC-2026-0042 */
  caseRef: varchar("caseRef", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  /** Current severity (may escalate over time) */
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("high").notNull(),
  status: mysqlEnum("status", [
    "open", "awaiting_vendor", "vendor_responded", "under_review",
    "resolved", "closed", "auto_escalated"
  ]).default("open").notNull(),
  /** AI-generated inquiry sent to vendor */
  inquiryContent: text("inquiryContent"),
  /** JSON snapshot of the metric breach data at trigger time */
  triggerData: json("triggerData"),
  /** Deadline for vendor response */
  responseDeadline: timestamp("responseDeadline"),
  /** Number of follow-ups sent */
  followUpCount: int("followUpCount").default(0).notNull(),
  /** Mia's AI analysis of the case (updated as responses come in) */
  miaAnalysis: text("miaAnalysis"),
  /** Resolution notes */
  resolutionNotes: text("resolutionNotes"),
  resolvedAt: timestamp("resolvedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscalationCase = typeof escalationCases.$inferSelect;
export type InsertEscalationCase = typeof escalationCases.$inferInsert;

// ─── Escalation Timeline (full audit trail per case) ────────────────────────
export const escalationTimeline = mysqlTable("escalation_timeline", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  /** Event types for the timeline */
  eventType: mysqlEnum("eventType", [
    "case_created", "inquiry_sent", "vendor_viewed", "vendor_responded",
    "follow_up_sent", "severity_escalated", "mia_analysis", "status_changed",
    "resolution_verified", "note_added", "token_accessed"
  ]).notNull(),
  /** Who triggered this event: system, user, vendor, mia */
  actor: mysqlEnum("actor", ["system", "user", "vendor", "mia"]).default("system").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  /** Optional metadata JSON */
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscalationTimelineEntry = typeof escalationTimeline.$inferSelect;
export type InsertEscalationTimelineEntry = typeof escalationTimeline.$inferInsert;

// ─── Vendor Portal Tokens (secure access management) ────────────────────────
export const vendorPortalTokens = mysqlTable("vendor_portal_tokens", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull(),
  /** Cryptographically secure token (SHA-256 hash stored, raw sent to vendor) */
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  /** Short display identifier for the token (last 8 chars) */
  tokenSuffix: varchar("tokenSuffix", { length: 8 }).notNull(),
  /** Human-readable label for this token */
  label: varchar("label", { length: 255 }),
  /** Scoped to specific case IDs (JSON array), null = all vendor's cases */
  caseScope: json("caseScope"),
  /** Optional IP allowlist (JSON array of CIDR strings), null = no restriction */
  ipAllowlist: json("ipAllowlist"),
  /** Token expiry date */
  expiresAt: timestamp("expiresAt").notNull(),
  /** Whether this token has been manually revoked */
  isRevoked: boolean("isRevoked").default(false).notNull(),
  /** Last time this token was used to access the portal */
  lastAccessedAt: timestamp("lastAccessedAt"),
  /** Total number of times this token was used */
  accessCount: int("accessCount").default(0).notNull(),
  /** Who created this token */
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VendorPortalToken = typeof vendorPortalTokens.$inferSelect;
export type InsertVendorPortalToken = typeof vendorPortalTokens.$inferInsert;

// ─── Vendor Responses (structured responses from vendor portal) ─────────────
export const vendorResponses = mysqlTable("vendor_responses", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  vendorId: int("vendorId").notNull(),
  /** Which token was used to submit this response */
  tokenId: int("tokenId"),
  /** Structured response fields */
  rootCause: text("rootCause"),
  remediationPlan: text("remediationPlan"),
  timeline: varchar("timeline", { length: 255 }),
  preventionMeasures: text("preventionMeasures"),
  /** Additional free-form notes */
  additionalNotes: text("additionalNotes"),
  /** Evidence/attachment URLs (JSON array) */
  evidenceUrls: json("evidenceUrls"),
  /** Whether this was AI-assisted (vendor used their AI agent) */
  isAiAssisted: boolean("isAiAssisted").default(false).notNull(),
  /** Mia's analysis of this specific response */
  miaResponseAnalysis: text("miaResponseAnalysis"),
  /** IP address of the submitter (for audit) */
  submitterIp: varchar("submitterIp", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VendorResponse = typeof vendorResponses.$inferSelect;
export type InsertVendorResponse = typeof vendorResponses.$inferInsert;

// ─── Escalation Audit Log (security-focused event log) ──────────────────────
export const escalationAuditLog = mysqlTable("escalation_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  /** Event category */
  eventCategory: mysqlEnum("eventCategory", [
    "token_created", "token_revoked", "token_expired", "token_accessed",
    "portal_accessed", "response_submitted", "ip_blocked",
    "rate_limited", "invalid_token", "case_exported"
  ]).notNull(),
  /** Related entity IDs */
  vendorId: int("vendorId"),
  tokenId: int("tokenId"),
  caseId: int("caseId"),
  /** IP address of the request */
  ipAddress: varchar("ipAddress", { length: 45 }),
  /** User agent string */
  userAgent: text("userAgent"),
  /** Additional details */
  details: text("details"),
  /** Whether this was a security-relevant event (failed access, blocked IP, etc.) */
  isSecurityEvent: boolean("isSecurityEvent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EscalationAuditLogEntry = typeof escalationAuditLog.$inferSelect;
export type InsertEscalationAuditLogEntry = typeof escalationAuditLog.$inferInsert;

// ─── Vendor AI Agents (vendor-side response assistants) ─────────────────────
export const vendorAiAgents = mysqlTable("vendor_ai_agents", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** System prompt / knowledge base for this vendor's AI agent */
  systemPrompt: text("systemPrompt").notNull(),
  /** Known issues and standard remediation playbook (fed to AI) */
  knowledgeBase: text("knowledgeBase"),
  /** Whether this agent is active */
  isActive: boolean("isActive").default(true).notNull(),
  /** Token required to manage this agent */
  managedByTokenId: int("managedByTokenId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VendorAiAgent = typeof vendorAiAgents.$inferSelect;
export type InsertVendorAiAgent = typeof vendorAiAgents.$inferInsert;

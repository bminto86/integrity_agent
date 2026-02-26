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

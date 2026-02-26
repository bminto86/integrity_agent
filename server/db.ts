import { eq, desc, and, gte, lte, sql, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  vendors, InsertVendor,
  vendorMetrics, InsertVendorMetric,
  alerts, InsertAlert,
  tasks, InsertTask,
  meetings, InsertMeeting,
  reports, InsertReport,
  documents, InsertDocument,
  scorecards, InsertScorecard,
  communications, InsertCommunication,
  workforcePlans, InsertWorkforcePlan,
  userSettings, InsertUserSetting,
  notifications, InsertNotification,
  customAgents, InsertCustomAgent,
  agentMessages, InsertAgentMessage,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Vendors ─────────────────────────────────────────────────────────────────
export async function listVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).orderBy(asc(vendors.name));
}

export async function getVendor(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
  return result[0];
}

export async function createVendor(data: InsertVendor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vendors).values(data);
  return { id: result[0].insertId };
}

export async function updateVendor(id: number, data: Partial<InsertVendor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(vendors).set(data).where(eq(vendors.id, id));
}

export async function deleteVendor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(vendors).where(eq(vendors.id, id));
}

// ─── Vendor Metrics ──────────────────────────────────────────────────────────
export async function addVendorMetric(data: InsertVendorMetric) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vendorMetrics).values(data);
  return { id: result[0].insertId };
}

export async function getVendorMetrics(vendorId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(vendorMetrics.vendorId, vendorId)];
  if (startDate) conditions.push(gte(vendorMetrics.date, startDate));
  if (endDate) conditions.push(lte(vendorMetrics.date, endDate));
  return db.select().from(vendorMetrics).where(and(...conditions)).orderBy(asc(vendorMetrics.date));
}

export async function getLatestMetricsForAllVendors() {
  const db = await getDb();
  if (!db) return [];
  // Get latest metric per vendor using subquery
  const result = await db.execute(sql`
    SELECT vm.* FROM vendor_metrics vm
    INNER JOIN (
      SELECT vendorId, MAX(date) as maxDate FROM vendor_metrics GROUP BY vendorId
    ) latest ON vm.vendorId = latest.vendorId AND vm.date = latest.maxDate
    ORDER BY vm.vendorId
  `);
  return (result as any)[0] || [];
}

export async function getAllMetrics() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendorMetrics).orderBy(asc(vendorMetrics.date));
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
export async function listAlerts(onlyUnread = false) {
  const db = await getDb();
  if (!db) return [];
  if (onlyUnread) {
    return db.select().from(alerts).where(eq(alerts.isRead, false)).orderBy(desc(alerts.createdAt));
  }
  return db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(100);
}

export async function createAlert(data: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alerts).values(data);
  return { id: result[0].insertId };
}

export async function markAlertRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
}

export async function resolveAlert(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(alerts).set({ isResolved: true, resolvedAt: new Date() }).where(eq(alerts.id, id));
}

// ─── Tasks ───────────────────────────────────────────────────────────────────
export async function listTasks(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status && status !== "all") {
    return db.select().from(tasks).where(eq(tasks.status, status as any)).orderBy(desc(tasks.createdAt));
  }
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data);
  return { id: result[0].insertId };
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.status === "done") data.completedAt = new Date();
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ─── Meetings ────────────────────────────────────────────────────────────────
export async function listMeetings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetings).orderBy(desc(meetings.scheduledAt));
}

export async function getMeeting(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  return result[0];
}

export async function createMeeting(data: InsertMeeting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(meetings).values(data);
  return { id: result[0].insertId };
}

export async function updateMeeting(id: number, data: Partial<InsertMeeting>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(meetings).set(data).where(eq(meetings.id, id));
}

export async function deleteMeeting(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(meetings).where(eq(meetings.id, id));
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export async function listReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).orderBy(desc(reports.createdAt));
}

export async function getReport(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return result[0];
}

export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reports).values(data);
  return { id: result[0].insertId };
}

export async function deleteReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reports).where(eq(reports.id, id));
}

// ─── Documents ───────────────────────────────────────────────────────────────
export async function listDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).orderBy(desc(documents.updatedAt));
}

export async function getDocument(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return { id: result[0].insertId };
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documents).set(data).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documents).where(eq(documents.id, id));
}

// ─── Scorecards ──────────────────────────────────────────────────────────────
export async function listScorecards(vendorId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (vendorId) {
    return db.select().from(scorecards).where(eq(scorecards.vendorId, vendorId)).orderBy(desc(scorecards.createdAt));
  }
  return db.select().from(scorecards).orderBy(desc(scorecards.createdAt));
}

export async function createScorecard(data: InsertScorecard) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scorecards).values(data);
  return { id: result[0].insertId };
}

export async function deleteScorecard(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scorecards).where(eq(scorecards.id, id));
}

// ─── Communications ──────────────────────────────────────────────────────────
export async function listCommunications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communications).orderBy(desc(communications.createdAt));
}

export async function getCommunication(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(communications).where(eq(communications.id, id)).limit(1);
  return result[0];
}

export async function createCommunication(data: InsertCommunication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(communications).values(data);
  return { id: result[0].insertId };
}

export async function updateCommunication(id: number, data: Partial<InsertCommunication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(communications).set(data).where(eq(communications.id, id));
}

export async function deleteCommunication(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(communications).where(eq(communications.id, id));
}

// ─── Workforce Plans ─────────────────────────────────────────────────────────
export async function listWorkforcePlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workforcePlans).orderBy(desc(workforcePlans.createdAt));
}

export async function getWorkforcePlan(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workforcePlans).where(eq(workforcePlans.id, id)).limit(1);
  return result[0];
}

export async function createWorkforcePlan(data: InsertWorkforcePlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workforcePlans).values(data);
  return { id: result[0].insertId };
}

export async function deleteWorkforcePlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workforcePlans).where(eq(workforcePlans.id, id));
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { vendorCount: 0, activeAlerts: 0, openTasks: 0, upcomingMeetings: 0 };

  const [vendorResult] = await db.select({ count: sql<number>`count(*)` }).from(vendors);
  const [alertResult] = await db.select({ count: sql<number>`count(*)` }).from(alerts).where(and(eq(alerts.isRead, false), eq(alerts.isResolved, false)));
  const [taskResult] = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(sql`${tasks.status} != 'done'`);
  const [meetingResult] = await db.select({ count: sql<number>`count(*)` }).from(meetings).where(gte(meetings.scheduledAt, new Date()));

  return {
    vendorCount: vendorResult?.count ?? 0,
    activeAlerts: alertResult?.count ?? 0,
    openTasks: taskResult?.count ?? 0,
    upcomingMeetings: meetingResult?.count ?? 0,
  };
}

// ─── User Settings ──────────────────────────────────────────────────────────
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserSettings(userId: number, settings: Partial<InsertUserSetting>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserSettings(userId);
  if (existing) {
    await db.update(userSettings).set({ ...settings, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({ userId, ...settings });
  }
  return { success: true };
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function listNotifications(userId: number, opts?: { unreadOnly?: boolean; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(notifications)
    .where(
      opts?.unreadOnly
        ? and(eq(notifications.userId, userId), eq(notifications.isDismissed, false), eq(notifications.isRead, false))
        : and(eq(notifications.userId, userId), eq(notifications.isDismissed, false))
    )
    .orderBy(desc(notifications.createdAt));
  if (opts?.limit) query = query.limit(opts.limit) as typeof query;
  return query;
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false), eq(notifications.isDismissed, false)));
  return result[0]?.count ?? 0;
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notifications).values(data);
  return result;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function dismissNotification(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isDismissed: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markNotificationPushed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ pushedToOwner: true }).where(eq(notifications.id, id));
}

// ─── SLA Breach Detection Job ──────────────────────────────────────────────

export async function runSlaBreachCheck(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const allVendors = await db.select().from(vendors).where(eq(vendors.contractStatus, "active"));
  const breaches: Array<{ vendorName: string; metric: string; value: number; target: number }> = [];

  for (const vendor of allVendors) {
    const latestMetrics = await db.select().from(vendorMetrics)
      .where(eq(vendorMetrics.vendorId, vendor.id))
      .orderBy(desc(vendorMetrics.date))
      .limit(1);

    if (latestMetrics.length === 0) continue;
    const m = latestMetrics[0];

    if (vendor.slaAccuracyTarget && m.accuracyRate !== null && Number(m.accuracyRate) < Number(vendor.slaAccuracyTarget)) {
      breaches.push({ vendorName: vendor.name, metric: "Accuracy Rate", value: Number(m.accuracyRate), target: Number(vendor.slaAccuracyTarget) });
      await createNotification({
        userId,
        type: "sla_breach",
        severity: "critical",
        title: `SLA Breach: ${vendor.name} accuracy at ${Number(m.accuracyRate).toFixed(1)}%`,
        message: `${vendor.name} accuracy rate (${Number(m.accuracyRate).toFixed(1)}%) is below the SLA target of ${Number(vendor.slaAccuracyTarget).toFixed(1)}%. Immediate attention required.`,
        actionUrl: `/vendors/${vendor.id}`,
        relatedEntityType: "vendor",
        relatedEntityId: vendor.id,
      });
    }

    if (vendor.slaThroughputTarget && m.throughput !== null && m.throughput < vendor.slaThroughputTarget) {
      breaches.push({ vendorName: vendor.name, metric: "Throughput", value: m.throughput, target: vendor.slaThroughputTarget });
      await createNotification({
        userId,
        type: "sla_breach",
        severity: "high",
        title: `SLA Breach: ${vendor.name} throughput at ${m.throughput}/hr`,
        message: `${vendor.name} throughput (${m.throughput}/hr) is below the SLA target of ${vendor.slaThroughputTarget}/hr.`,
        actionUrl: `/vendors/${vendor.id}`,
        relatedEntityType: "vendor",
        relatedEntityId: vendor.id,
      });
    }

    if (vendor.slaResponseTimeTarget && m.responseTimeHours !== null && Number(m.responseTimeHours) > Number(vendor.slaResponseTimeTarget)) {
      breaches.push({ vendorName: vendor.name, metric: "Response Time", value: Number(m.responseTimeHours), target: Number(vendor.slaResponseTimeTarget) });
      await createNotification({
        userId,
        type: "quality_drop",
        severity: "high",
        title: `Response Time Breach: ${vendor.name} at ${Number(m.responseTimeHours).toFixed(1)}hrs`,
        message: `${vendor.name} response time (${Number(m.responseTimeHours).toFixed(1)}hrs) exceeds the SLA target of ${Number(vendor.slaResponseTimeTarget).toFixed(1)}hrs.`,
        actionUrl: `/vendors/${vendor.id}`,
        relatedEntityType: "vendor",
        relatedEntityId: vendor.id,
      });
    }
  }

  return breaches;
}

// ─── Task Deadline Reminder Job ─────────────────────────────────────────────

export async function runTaskDeadlineCheck(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const reminders: Array<{ taskTitle: string; status: string; dueDate: Date }> = [];

  // Overdue tasks
  const overdueTasks = await db.select().from(tasks)
    .where(and(
      eq(tasks.createdBy, userId),
      sql`${tasks.dueDate} < ${now}`,
      sql`${tasks.status} != 'done'`
    ));

  for (const task of overdueTasks) {
    if (!task.dueDate) continue;
    reminders.push({ taskTitle: task.title, status: "overdue", dueDate: task.dueDate });
    await createNotification({
      userId,
      type: "task_overdue",
      severity: "high",
      title: `Overdue: ${task.title}`,
      message: `This task was due on ${task.dueDate.toLocaleDateString()} and is still ${task.status}. Consider reprioritizing or delegating.`,
      actionUrl: "/tasks",
      relatedEntityType: "task",
      relatedEntityId: task.id,
    });
  }

  // Due soon tasks (within 24 hours)
  const dueSoonTasks = await db.select().from(tasks)
    .where(and(
      eq(tasks.createdBy, userId),
      sql`${tasks.dueDate} >= ${now}`,
      sql`${tasks.dueDate} <= ${tomorrow}`,
      sql`${tasks.status} != 'done'`
    ));

  for (const task of dueSoonTasks) {
    if (!task.dueDate) continue;
    reminders.push({ taskTitle: task.title, status: "due_soon", dueDate: task.dueDate });
    await createNotification({
      userId,
      type: "task_due_soon",
      severity: "medium",
      title: `Due Soon: ${task.title}`,
      message: `This task is due ${task.dueDate.toLocaleTimeString()} today. Make sure it's on track.`,
      actionUrl: "/tasks",
      relatedEntityType: "task",
      relatedEntityId: task.id,
    });
  }

  return reminders;
}

// ─── Custom Agents ──────────────────────────────────────────────────────────

export async function listCustomAgents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customAgents)
    .where(eq(customAgents.createdBy, userId))
    .orderBy(desc(customAgents.updatedAt));
}

export async function getCustomAgent(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customAgents)
    .where(and(eq(customAgents.id, id), eq(customAgents.createdBy, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function createCustomAgent(data: InsertCustomAgent) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(customAgents).values(data);
  return result;
}

export async function updateCustomAgent(id: number, userId: number, data: Partial<InsertCustomAgent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customAgents).set(data)
    .where(and(eq(customAgents.id, id), eq(customAgents.createdBy, userId)));
}

export async function deleteCustomAgent(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Delete conversation history first
  await db.delete(agentMessages).where(and(eq(agentMessages.agentId, id), eq(agentMessages.userId, userId)));
  // Then delete the agent
  await db.delete(customAgents).where(and(eq(customAgents.id, id), eq(customAgents.createdBy, userId)));
}

// ─── Agent Messages ─────────────────────────────────────────────────────────

export async function listAgentMessages(agentId: number, userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentMessages)
    .where(and(eq(agentMessages.agentId, agentId), eq(agentMessages.userId, userId)))
    .orderBy(asc(agentMessages.createdAt))
    .limit(limit);
}

export async function addAgentMessage(data: InsertAgentMessage) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(agentMessages).values(data);
}

export async function clearAgentConversation(agentId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(agentMessages).where(and(eq(agentMessages.agentId, agentId), eq(agentMessages.userId, userId)));
}

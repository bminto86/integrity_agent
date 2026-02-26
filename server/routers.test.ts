import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    activeVendors: 3,
    activeAlerts: 2,
    openTasks: 5,
    upcomingMeetings: 1,
  }),
  getLatestMetricsForAllVendors: vi.fn().mockResolvedValue([]),
  listVendors: vi.fn().mockResolvedValue([
    { id: 1, name: "Vendor A", region: "APAC", contractStatus: "active", headcount: 50, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Vendor B", region: "EMEA", contractStatus: "active", headcount: 30, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getVendor: vi.fn().mockResolvedValue({ id: 1, name: "Vendor A", region: "APAC", contractStatus: "active", headcount: 50 }),
  createVendor: vi.fn().mockResolvedValue({ insertId: 3 }),
  updateVendor: vi.fn().mockResolvedValue(undefined),
  deleteVendor: vi.fn().mockResolvedValue(undefined),
  addVendorMetric: vi.fn().mockResolvedValue({ insertId: 1 }),
  getVendorMetrics: vi.fn().mockResolvedValue([
    { id: 1, vendorId: 1, date: new Date(), accuracyRate: 95.5, throughput: 120, qualityScore: 88 },
  ]),
  getAllMetrics: vi.fn().mockResolvedValue([]),
  listAlerts: vi.fn().mockResolvedValue([
    { id: 1, type: "sla_breach", severity: "high", title: "SLA Breach", isRead: false, isResolved: false, createdAt: new Date() },
  ]),
  createAlert: vi.fn().mockResolvedValue({ insertId: 1 }),
  markAlertRead: vi.fn().mockResolvedValue(undefined),
  resolveAlert: vi.fn().mockResolvedValue(undefined),
  listTasks: vi.fn().mockResolvedValue([
    { id: 1, title: "Review SLA", status: "todo", priority: "high", category: "vendor_mgmt", createdBy: 1, createdAt: new Date() },
  ]),
  createTask: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  listMeetings: vi.fn().mockResolvedValue([]),
  getMeeting: vi.fn().mockResolvedValue({ id: 1, title: "Weekly Sync" }),
  createMeeting: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateMeeting: vi.fn().mockResolvedValue(undefined),
  deleteMeeting: vi.fn().mockResolvedValue(undefined),
  listReports: vi.fn().mockResolvedValue([]),
  getReport: vi.fn().mockResolvedValue({ id: 1, title: "Weekly Report" }),
  createReport: vi.fn().mockResolvedValue({ insertId: 1 }),
  deleteReport: vi.fn().mockResolvedValue(undefined),
  listDocuments: vi.fn().mockResolvedValue([]),
  getDocument: vi.fn().mockResolvedValue({ id: 1, title: "SOP" }),
  createDocument: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateDocument: vi.fn().mockResolvedValue(undefined),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  listScorecards: vi.fn().mockResolvedValue([]),
  createScorecard: vi.fn().mockResolvedValue({ insertId: 1 }),
  deleteScorecard: vi.fn().mockResolvedValue(undefined),
  listCommunications: vi.fn().mockResolvedValue([]),
  getCommunication: vi.fn().mockResolvedValue({ id: 1, subject: "Update" }),
  createCommunication: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateCommunication: vi.fn().mockResolvedValue(undefined),
  deleteCommunication: vi.fn().mockResolvedValue(undefined),
  listWorkforcePlans: vi.fn().mockResolvedValue([]),
  getWorkforcePlan: vi.fn().mockResolvedValue({ id: 1, title: "Q1 Plan" }),
  createWorkforcePlan: vi.fn().mockResolvedValue({ insertId: 1 }),
  deleteWorkforcePlan: vi.fn().mockResolvedValue(undefined),
  getUserSettings: vi.fn().mockResolvedValue({ avatarId: "option-2", agentName: "Mia", voiceEnabled: true }),
  upsertUserSettings: vi.fn().mockResolvedValue({ success: true }),
  listNotifications: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, type: "sla_breach", severity: "critical", title: "SLA Breach: Vendor A", message: "Accuracy below target", actionUrl: "/vendors/1", isRead: false, isDismissed: false, createdAt: new Date() },
    { id: 2, userId: 1, type: "task_overdue", severity: "high", title: "Overdue: Review SLA", message: "Task was due yesterday", actionUrl: "/tasks", isRead: true, isDismissed: false, createdAt: new Date() },
  ]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(3),
  createNotification: vi.fn().mockResolvedValue({ insertId: 1 }),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  dismissNotification: vi.fn().mockResolvedValue(undefined),
  markNotificationPushed: vi.fn().mockResolvedValue(undefined),
  runSlaBreachCheck: vi.fn().mockResolvedValue([{ vendorName: "Vendor A", metric: "Accuracy Rate", value: 90.5, target: 95 }]),
  runTaskDeadlineCheck: vi.fn().mockResolvedValue([{ taskTitle: "Review SLA", status: "overdue", dueDate: new Date() }]),
  seedBuiltInAgentsForUser: vi.fn().mockResolvedValue(undefined),
  listCustomAgents: vi.fn().mockResolvedValue([
    { id: 1, name: "SLA Guardian", role: "SLA Specialist", description: "Monitors SLA compliance", expertise: "SLA, compliance", personality: "Direct", systemPrompt: "You are an SLA specialist.", avatarId: "option-1", accentColor: "#6366f1", voiceEnabled: true, userId: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getCustomAgent: vi.fn().mockResolvedValue({ id: 1, name: "SLA Guardian", role: "SLA Specialist", description: "Monitors SLA compliance", expertise: "SLA, compliance", personality: "Direct", systemPrompt: "You are an SLA specialist.", avatarId: "option-1", accentColor: "#6366f1", voiceEnabled: true, userId: 1, createdAt: new Date(), updatedAt: new Date() }),
  createCustomAgent: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateCustomAgent: vi.fn().mockResolvedValue(undefined),
  deleteCustomAgent: vi.fn().mockResolvedValue(undefined),
  getAgentMessages: vi.fn().mockResolvedValue([
    { id: 1, agentId: 1, role: "user", content: "Hello", createdAt: new Date() },
    { id: 2, agentId: 1, role: "assistant", content: "Hi there!", createdAt: new Date() },
  ]),
  listAgentMessages: vi.fn().mockResolvedValue([
    { id: 1, agentId: 1, role: "user", content: "Hello", createdAt: new Date() },
    { id: 2, agentId: 1, role: "assistant", content: "Hi there!", createdAt: new Date() },
  ]),
  addAgentMessage: vi.fn().mockResolvedValue({ insertId: 3 }),
  clearAgentConversation: vi.fn().mockResolvedValue(undefined),
  bulkImportMetrics: vi.fn().mockResolvedValue({ imported: 5 }),
}));

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "AI generated content" } }],
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
describe("dashboard", () => {
  it("returns dashboard stats for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const stats = await caller.dashboard.stats();
    expect(stats).toHaveProperty("activeVendors");
    expect(stats).toHaveProperty("activeAlerts");
    expect(stats).toHaveProperty("openTasks");
    expect(stats).toHaveProperty("upcomingMeetings");
    expect(stats.activeVendors).toBe(3);
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });
});

// ─── Vendors ────────────────────────────────────────────────────────────────
describe("vendors", () => {
  it("lists vendors", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const vendors = await caller.vendors.list();
    expect(Array.isArray(vendors)).toBe(true);
    expect(vendors.length).toBe(2);
    expect(vendors[0].name).toBe("Vendor A");
  });

  it("gets a single vendor", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const vendor = await caller.vendors.get({ id: 1 });
    expect(vendor).toBeDefined();
    expect(vendor?.name).toBe("Vendor A");
  });

  it("creates a vendor", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.vendors.create({
      name: "Vendor C",
      region: "LATAM",
      contractStatus: "pending",
      headcount: 20,
    });
    expect(result).toBeDefined();
  });

  it("updates a vendor", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.vendors.update({ id: 1, name: "Vendor A Updated" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a vendor", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.vendors.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("rejects vendor creation with empty name", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.vendors.create({ name: "" })).rejects.toThrow();
  });
});

// ─── Metrics ────────────────────────────────────────────────────────────────
describe("metrics", () => {
  it("adds a vendor metric", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.metrics.add({
      vendorId: 1,
      date: new Date(),
      accuracyRate: 95.5,
      throughput: 120,
      qualityScore: 88,
    });
    expect(result).toBeDefined();
  });

  it("gets metrics for a vendor", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const metrics = await caller.metrics.getForVendor({ vendorId: 1 });
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics[0].accuracyRate).toBe(95.5);
  });

  it("gets all metrics", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const metrics = await caller.metrics.getAll();
    expect(Array.isArray(metrics)).toBe(true);
  });
});

// ─── Alerts ─────────────────────────────────────────────────────────────────
describe("alerts", () => {
  it("lists alerts", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const alerts = await caller.alerts.list();
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts[0].title).toBe("SLA Breach");
  });

  it("creates an alert", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.alerts.create({
      type: "sla_breach",
      severity: "high",
      title: "Accuracy below threshold",
    });
    expect(result).toBeDefined();
  });

  it("marks an alert as read", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.alerts.markRead({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("resolves an alert", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.alerts.resolve({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ─── Tasks ──────────────────────────────────────────────────────────────────
describe("tasks", () => {
  it("lists tasks", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks[0].title).toBe("Review SLA");
  });

  it("creates a task", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.tasks.create({
      title: "New Task",
      priority: "high",
      category: "vendor_mgmt",
      status: "todo",
    });
    expect(result).toBeDefined();
  });

  it("updates a task", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.tasks.update({ id: 1, status: "in_progress" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a task", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.tasks.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("rejects task creation with empty title", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.tasks.create({ title: "" })).rejects.toThrow();
  });
});

// ─── Meetings ───────────────────────────────────────────────────────────────
describe("meetings", () => {
  it("lists meetings", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const meetings = await caller.meetings.list();
    expect(Array.isArray(meetings)).toBe(true);
  });

  it("creates a meeting", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meetings.create({
      title: "Weekly 1:1",
      meetingType: "one_on_one",
      attendees: "John Doe",
    });
    expect(result).toBeDefined();
  });

  it("updates a meeting", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meetings.update({ id: 1, notes: "Updated notes" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a meeting", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.meetings.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ─── Reports ────────────────────────────────────────────────────────────────
describe("reports", () => {
  it("lists reports", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const reports = await caller.reports.list();
    expect(Array.isArray(reports)).toBe(true);
  });

  it("creates a report", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.reports.create({
      title: "Weekly Report",
      reportType: "weekly",
      content: "Report content",
    });
    expect(result).toBeDefined();
  });

  it("deletes a report", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.reports.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ─── Documents ──────────────────────────────────────────────────────────────
describe("documents", () => {
  it("lists documents", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const docs = await caller.documents.list();
    expect(Array.isArray(docs)).toBe(true);
  });

  it("creates a document", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.documents.create({
      title: "New SOP",
      docType: "sop",
      content: "SOP content",
    });
    expect(result).toBeDefined();
  });

  it("updates a document", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.documents.update({ id: 1, status: "published" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a document", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.documents.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ─── Scorecards ─────────────────────────────────────────────────────────────
describe("scorecards", () => {
  it("lists scorecards", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const cards = await caller.scorecards.list();
    expect(Array.isArray(cards)).toBe(true);
  });

  it("creates a scorecard", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.scorecards.create({
      vendorId: 1,
      period: "monthly",
      overallScore: 85,
      accuracyScore: 90,
      throughputScore: 80,
      qualityScore: 88,
    });
    expect(result).toBeDefined();
  });

  it("deletes a scorecard", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.scorecards.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ─── Communications ─────────────────────────────────────────────────────────
describe("communications", () => {
  it("lists communications", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const comms = await caller.communications.list();
    expect(Array.isArray(comms)).toBe(true);
  });

  it("creates a communication", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.communications.create({
      subject: "Vendor Update",
      commType: "status_update",
      content: "Update content",
    });
    expect(result).toBeDefined();
  });

  it("updates a communication", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.communications.update({ id: 1, status: "sent" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a communication", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.communications.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ─── Workforce Plans ────────────────────────────────────────────────────────
describe("workforce", () => {
  it("lists workforce plans", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const plans = await caller.workforce.list();
    expect(Array.isArray(plans)).toBe(true);
  });

  it("creates a workforce plan", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.workforce.create({
      title: "Q1 Staffing Plan",
      projectedVolume: 50000,
      recommendedHeadcount: 25,
    });
    expect(result).toBeDefined();
  });

  it("deletes a workforce plan", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.workforce.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ─── AI Features ────────────────────────────────────────────────────────────
describe("ai", () => {
  it("generates a report", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.ai.generateReport({ reportType: "weekly" });
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });

  it("generates talking points", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.ai.generateTalkingPoints({
      meetingType: "one_on_one",
      attendee: "John Doe",
    });
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });

  it("drafts a communication", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.ai.draftCommunication({
      commType: "escalation",
      subject: "Urgent: Vendor Performance Issue",
    });
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });

  it("generates a document", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.ai.generateDocument({
      docType: "sop",
      title: "Content Review Process",
    });
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });

  it("summarizes a meeting", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.ai.summarizeMeeting({
      notes: "Discussed Q4 performance. Action: review SLA by Friday.",
    });
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });

  it("generates workforce forecast", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        projectedVolume: 60000,
        recommendedHeadcount: 30,
        assumptions: "Based on 10% growth",
        recommendations: "Hire 5 more",
      }) } }],
    });

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.ai.workforceForecast({
      currentVolume: 50000,
      currentHeadcount: 25,
      growthRate: 10,
    });
    expect(result).toHaveProperty("projectedVolume");
    expect(result).toHaveProperty("recommendedHeadcount");
  });

  it("performs quality analysis", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.ai.qualityAnalysis({});
    expect(result).toHaveProperty("content");
    expect(typeof result.content).toBe("string");
  });

  it("generates a scorecard", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        overallScore: 85,
        accuracyScore: 90,
        throughputScore: 80,
        qualityScore: 88,
        responseTimeScore: 82,
        commentary: "Good performance overall",
        recommendations: "Focus on throughput",
      }) } }],
    });

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.ai.generateScorecard({
      vendorId: 1,
      period: "monthly",
    });
    expect(result).toHaveProperty("overallScore");
    expect(result.overallScore).toBe(85);
  });
});

// ─── Bulk Import ───────────────────────────────────────────────────────────
describe("metrics.bulkImport", () => {
  it("imports multiple metrics", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.metrics.bulkImport({
      metrics: [
        { vendorId: 1, date: "2026-01-15", accuracyRate: "95.5", throughput: 120 },
        { vendorId: 2, date: "2026-01-15", qualityScore: "88" },
      ],
    });
    expect(result).toHaveProperty("count");
    expect(result.count).toBe(2);
  });

  it("handles empty import", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.metrics.bulkImport({ metrics: [] });
    expect(result.count).toBe(0);
  });
});

// ─── SLA Breach Detection ──────────────────────────────────────────────────
describe("sla.checkBreaches", () => {
  it("detects SLA breaches and creates alerts", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.sla.checkBreaches();
    expect(result).toHaveProperty("breachCount");
    expect(result).toHaveProperty("breaches");
    expect(Array.isArray(result.breaches)).toBe(true);
  });
});

// ─── Auth Protection ────────────────────────────────────────────────────────
describe("auth protection", () => {
  it("rejects unauthenticated access to vendors.list", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.vendors.list()).rejects.toThrow();
  });

  it("rejects unauthenticated access to tasks.list", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.tasks.list()).rejects.toThrow();
  });

  it("rejects unauthenticated access to ai.generateReport", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.ai.generateReport({ reportType: "weekly" })).rejects.toThrow();
  });

  it("allows unauthenticated access to auth.me", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ─── Settings ──────────────────────────────────────────────────────────────
describe("settings", () => {
  it("returns user settings for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const settings = await caller.settings.get();
    expect(settings).toHaveProperty("avatarId");
    expect(settings).toHaveProperty("agentName");
    expect(settings).toHaveProperty("voiceEnabled");
    expect(settings.avatarId).toBe("option-2");
    expect(settings.agentName).toBe("Mia");
    expect(settings.voiceEnabled).toBe(true);
  });

  it("updates user settings", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.settings.update({ avatarId: "option-3", agentName: "Iris" });
    expect(result).toEqual({ success: true });
  });

  it("updates voice setting", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.settings.update({ voiceEnabled: false });
    expect(result).toEqual({ success: true });
  });

  it("rejects unauthenticated access to settings.get", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.settings.get()).rejects.toThrow();
  });

  it("rejects unauthenticated access to settings.update", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.settings.update({ avatarId: "option-1" })).rejects.toThrow();
  });
});

// ─── Notifications ──────────────────────────────────────────────────────────
describe("notifications", () => {
  it("lists notifications for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const notifications = await caller.notifications.list({ limit: 20 });
    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toHaveProperty("type", "sla_breach");
    expect(notifications[0]).toHaveProperty("severity", "critical");
    expect(notifications[1]).toHaveProperty("type", "task_overdue");
  });

  it("lists notifications with unreadOnly filter", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const notifications = await caller.notifications.list({ unreadOnly: true });
    expect(notifications).toBeDefined();
  });

  it("returns unread notification count", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const count = await caller.notifications.unreadCount();
    expect(count).toBe(3);
  });

  it("marks a notification as read", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.markRead({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("marks all notifications as read", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.markAllRead();
    expect(result).toEqual({ success: true });
  });

  it("dismisses a notification", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.dismiss({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("runs SLA breach check and returns breaches", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.runSlaCheck();
    expect(result.count).toBe(1);
    expect(result.breaches).toHaveLength(1);
    expect(result.breaches[0]).toHaveProperty("vendorName", "Vendor A");
    expect(result.breaches[0]).toHaveProperty("metric", "Accuracy Rate");
  });

  it("runs task deadline check and returns reminders", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.runTaskCheck();
    expect(result.count).toBe(1);
    expect(result.reminders).toHaveLength(1);
    expect(result.reminders[0]).toHaveProperty("taskTitle", "Review SLA");
    expect(result.reminders[0]).toHaveProperty("status", "overdue");
  });

  it("rejects unauthenticated access to notifications.list", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.notifications.list({})).rejects.toThrow();
  });

  it("rejects unauthenticated access to notifications.unreadCount", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.notifications.unreadCount()).rejects.toThrow();
  });

  it("rejects unauthenticated access to notifications.markRead", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.notifications.markRead({ id: 1 })).rejects.toThrow();
  });

  it("rejects unauthenticated access to notifications.runSlaCheck", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.notifications.runSlaCheck()).rejects.toThrow();
  });
});

// ─── Agent Library Tests ─────────────────────────────────────────────
describe("agents", () => {
  it("lists custom agents for the authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.agents.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe("SLA Guardian");
  });

  it("gets a single agent by id", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.agents.get({ id: 1 });
    expect(result.name).toBe("SLA Guardian");
    expect(result.systemPrompt).toBe("You are an SLA specialist.");
  });

  it("creates a new custom agent", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.agents.create({
      name: "Quality Analyst",
      role: "Quality Specialist",
      description: "Analyzes quality metrics",
      expertise: "quality, metrics",
      personality: "Analytical",
      systemPrompt: "You are a quality analyst.",
      avatarId: "option-3",
      accentColor: "#10b981",
      voiceEnabled: false,
    });
    expect(result.insertId).toBeDefined();
  });

  it("updates an existing agent", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.agents.update({
      id: 1,
      name: "SLA Guardian Pro",
      role: "Senior SLA Specialist",
    });
    expect(result.success).toBe(true);
  });

  it("deletes an agent", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.agents.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("retrieves agent message history", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.agents.messages({ agentId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("sends a chat message to an agent and gets AI reply", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.agents.chat({ agentId: 1, message: "What is the current SLA status?" });
    expect(result.reply).toBeDefined();
    expect(typeof result.reply).toBe("string");
  });

  it("clears agent conversation history", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.agents.clearHistory({ agentId: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated access to agents.list", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.agents.list()).rejects.toThrow();
  });
});

// ─── Mia Smart Chat Tests ────────────────────────────────────────────
describe("mia", () => {
  it("responds to a chat message with operational context", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.mia.chat({ message: "How are my vendors performing?" });
    expect(result.reply).toBeDefined();
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("handles different question types", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.mia.chat({ message: "What tasks are overdue?" });
    expect(result.reply).toBeDefined();
  });

  it("rejects unauthenticated access to mia.chat", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.mia.chat({ message: "Hello" })).rejects.toThrow();
  });

  it("rejects empty messages", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.mia.chat({ message: "" })).rejects.toThrow();
  });
});

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── User Settings ──────────────────────────────────────────────────
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getUserSettings(ctx.user.id);
      return settings ?? { avatarId: "option-2", agentName: "Mia", voiceEnabled: true };
    }),
    update: protectedProcedure.input(z.object({
      avatarId: z.string().optional(),
      agentName: z.string().optional(),
      voiceEnabled: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.upsertUserSettings(ctx.user.id, input);
    }),
  }),

  // ─── Dashboard ───────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    latestMetrics: protectedProcedure.query(async () => {
      return db.getLatestMetricsForAllVendors();
    }),
  }),

  // ─── Vendors ─────────────────────────────────────────────────────────
  vendors: router({
    list: protectedProcedure.query(async () => {
      return db.listVendors();
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getVendor(input.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      region: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      contractStatus: z.enum(["active", "pending", "expired", "terminated"]).optional(),
      slaAccuracyTarget: z.number().optional(),
      slaThroughputTarget: z.number().optional(),
      slaResponseTimeTarget: z.number().optional(),
      headcount: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createVendor({ ...input, createdBy: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      region: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      contractStatus: z.enum(["active", "pending", "expired", "terminated"]).optional(),
      slaAccuracyTarget: z.number().optional(),
      slaThroughputTarget: z.number().optional(),
      slaResponseTimeTarget: z.number().optional(),
      headcount: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateVendor(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteVendor(input.id);
      return { success: true };
    }),
  }),

  // ─── Vendor Metrics ──────────────────────────────────────────────────
  metrics: router({
    add: protectedProcedure.input(z.object({
      vendorId: z.number(),
      date: z.date(),
      accuracyRate: z.number().optional(),
      throughput: z.number().optional(),
      responseTimeHours: z.number().optional(),
      qualityScore: z.number().optional(),
      falsePositiveRate: z.number().optional(),
      falseNegativeRate: z.number().optional(),
      escalationRate: z.number().optional(),
      utilizationRate: z.number().optional(),
      reviewVolume: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.addVendorMetric(input);
    }),
    getForVendor: protectedProcedure.input(z.object({
      vendorId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })).query(async ({ input }) => {
      return db.getVendorMetrics(input.vendorId, input.startDate, input.endDate);
    }),
    getAll: protectedProcedure.query(async () => {
      return db.getAllMetrics();
    }),
    bulkImport: protectedProcedure.input(z.object({
      metrics: z.array(z.object({
        vendorId: z.number(),
        date: z.string(),
        accuracyRate: z.string().optional(),
        throughput: z.number().optional(),
        responseTime: z.string().optional(),
        qualityScore: z.string().optional(),
      })),
    })).mutation(async ({ input }) => {
      let count = 0;
      for (const m of input.metrics) {
        try {
          await db.addVendorMetric({
            vendorId: m.vendorId,
            date: new Date(m.date),
            accuracyRate: m.accuracyRate ? parseFloat(m.accuracyRate) : undefined,
            throughput: m.throughput,
            responseTimeHours: m.responseTime ? parseFloat(m.responseTime) : undefined,
            qualityScore: m.qualityScore ? parseFloat(m.qualityScore) : undefined,
          });
          count++;
        } catch (e) {
          console.warn("Skipped metric row:", e);
        }
      }
      return { count };
    }),
  }),

  // ─── SLA Breach Detection ───────────────────────────────────────────
  sla: router({
    checkBreaches: protectedProcedure.mutation(async () => {
      const vendorsList = await db.listVendors();
      const breaches: Array<{ vendorId: number; vendorName: string; metric: string; actual: number; target: number }> = [];

      for (const vendor of vendorsList) {
        if (vendor.contractStatus !== "active") continue;
        const metrics = await db.getVendorMetrics(vendor.id);
        if (metrics.length === 0) continue;
        const latest = metrics[metrics.length - 1];

        if (vendor.slaAccuracyTarget && latest.accuracyRate) {
          const target = parseFloat(String(vendor.slaAccuracyTarget));
          const actual = parseFloat(String(latest.accuracyRate));
          if (actual < target / 100) {
            breaches.push({ vendorId: vendor.id, vendorName: vendor.name, metric: "Accuracy Rate", actual: actual * 100, target });
          }
        }
        if (vendor.slaThroughputTarget && latest.throughput) {
          const target = Number(vendor.slaThroughputTarget);
          const actual = Number(latest.throughput);
          if (actual < target) {
            breaches.push({ vendorId: vendor.id, vendorName: vendor.name, metric: "Throughput", actual, target });
          }
        }
        if (vendor.slaResponseTimeTarget && latest.responseTimeHours) {
          const target = parseFloat(String(vendor.slaResponseTimeTarget));
          const actual = parseFloat(String(latest.responseTimeHours));
          if (actual > target) {
            breaches.push({ vendorId: vendor.id, vendorName: vendor.name, metric: "Response Time", actual, target });
          }
        }
      }

      // Create alerts for breaches
      for (const breach of breaches) {
        await db.createAlert({
          vendorId: breach.vendorId,
          type: "sla_breach",
          severity: "high",
          title: `SLA Breach: ${breach.vendorName} — ${breach.metric}`,
          description: `${breach.metric} is ${breach.actual.toFixed(2)} vs target ${breach.target}. Immediate attention required.`,
        });
      }

      return { breachCount: breaches.length, breaches };
    }),
  }),

  // ─── Alerts ──────────────────────────────────────────────────────────
  alerts: router({
    list: protectedProcedure.input(z.object({ onlyUnread: z.boolean().optional() }).optional()).query(async ({ input }) => {
      return db.listAlerts(input?.onlyUnread);
    }),
    create: protectedProcedure.input(z.object({
      vendorId: z.number().optional(),
      type: z.enum(["sla_breach", "quality_drop", "capacity_warning", "anomaly", "general"]),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      title: z.string(),
      description: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createAlert(input);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markAlertRead(input.id);
      return { success: true };
    }),
    resolve: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.resolveAlert(input.id);
      return { success: true };
    }),
  }),

  // ─── Tasks ───────────────────────────────────────────────────────────
  tasks: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.listTasks(input?.status);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      category: z.enum(["vendor_mgmt", "quality", "workforce", "reporting", "process", "general"]).optional(),
      assignee: z.string().optional(),
      dueDate: z.date().optional(),
      vendorId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createTask({ ...input, createdBy: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      category: z.enum(["vendor_mgmt", "quality", "workforce", "reporting", "process", "general"]).optional(),
      assignee: z.string().optional(),
      dueDate: z.date().optional(),
      vendorId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateTask(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteTask(input.id);
      return { success: true };
    }),
  }),

  // ─── Meetings ────────────────────────────────────────────────────────
  meetings: router({
    list: protectedProcedure.query(async () => {
      return db.listMeetings();
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getMeeting(input.id);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      meetingType: z.enum(["one_on_one", "team_sync", "vendor_review", "qbr", "stakeholder", "other"]).optional(),
      attendees: z.string().optional(),
      scheduledAt: z.date().optional(),
      duration: z.number().optional(),
      agendaItems: z.string().optional(),
      talkingPoints: z.string().optional(),
      notes: z.string().optional(),
      actionItems: z.string().optional(),
      summary: z.string().optional(),
      vendorId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createMeeting({ ...input, createdBy: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      meetingType: z.enum(["one_on_one", "team_sync", "vendor_review", "qbr", "stakeholder", "other"]).optional(),
      attendees: z.string().optional(),
      scheduledAt: z.date().optional(),
      duration: z.number().optional(),
      agendaItems: z.string().optional(),
      talkingPoints: z.string().optional(),
      notes: z.string().optional(),
      actionItems: z.string().optional(),
      summary: z.string().optional(),
      vendorId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateMeeting(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteMeeting(input.id);
      return { success: true };
    }),
  }),

  // ─── Reports ─────────────────────────────────────────────────────────
  reports: router({
    list: protectedProcedure.query(async () => {
      return db.listReports();
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getReport(input.id);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      reportType: z.enum(["weekly", "monthly", "quarterly", "custom"]).optional(),
      content: z.string().optional(),
      periodStart: z.date().optional(),
      periodEnd: z.date().optional(),
      metrics: z.string().optional(),
      insights: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createReport({ ...input, createdBy: ctx.user.id });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteReport(input.id);
      return { success: true };
    }),
  }),

  // ─── Documents ───────────────────────────────────────────────────────
  documents: router({
    list: protectedProcedure.query(async () => {
      return db.listDocuments();
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getDocument(input.id);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      docType: z.enum(["sop", "training", "process", "policy", "template", "other"]).optional(),
      content: z.string().optional(),
      status: z.enum(["draft", "review", "published", "archived"]).optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createDocument({ ...input, createdBy: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      docType: z.enum(["sop", "training", "process", "policy", "template", "other"]).optional(),
      content: z.string().optional(),
      status: z.enum(["draft", "review", "published", "archived"]).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDocument(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true };
    }),
  }),

  // ─── Scorecards ──────────────────────────────────────────────────────
  scorecards: router({
    list: protectedProcedure.input(z.object({ vendorId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.listScorecards(input?.vendorId);
    }),
    create: protectedProcedure.input(z.object({
      vendorId: z.number(),
      period: z.string(),
      overallScore: z.number().optional(),
      accuracyScore: z.number().optional(),
      throughputScore: z.number().optional(),
      qualityScore: z.number().optional(),
      responseTimeScore: z.number().optional(),
      commentary: z.string().optional(),
      recommendations: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createScorecard({ ...input, createdBy: ctx.user.id });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteScorecard(input.id);
      return { success: true };
    }),
  }),

  // ─── Communications ──────────────────────────────────────────────────
  communications: router({
    list: protectedProcedure.query(async () => {
      return db.listCommunications();
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getCommunication(input.id);
    }),
    create: protectedProcedure.input(z.object({
      commType: z.enum(["escalation", "status_update", "stakeholder_email", "vendor_comm", "program_update", "other"]).optional(),
      subject: z.string().min(1),
      content: z.string().optional(),
      recipients: z.string().optional(),
      status: z.enum(["draft", "sent", "archived"]).optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createCommunication({ ...input, createdBy: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      subject: z.string().optional(),
      content: z.string().optional(),
      recipients: z.string().optional(),
      status: z.enum(["draft", "sent", "archived"]).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCommunication(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteCommunication(input.id);
      return { success: true };
    }),
  }),

  // ─── Workforce Plans ─────────────────────────────────────────────────
  workforce: router({
    list: protectedProcedure.query(async () => {
      return db.listWorkforcePlans();
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getWorkforcePlan(input.id);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      vendorId: z.number().optional(),
      forecastPeriod: z.string().optional(),
      projectedVolume: z.number().optional(),
      recommendedHeadcount: z.number().optional(),
      currentHeadcount: z.number().optional(),
      assumptions: z.string().optional(),
      recommendations: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return db.createWorkforcePlan({ ...input, createdBy: ctx.user.id });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteWorkforcePlan(input.id);
      return { success: true };
    }),
  }),

  // ─── AI Features ─────────────────────────────────────────────────────
  ai: router({
    generateReport: protectedProcedure.input(z.object({
      reportType: z.enum(["weekly", "monthly", "quarterly", "custom"]),
      context: z.string().optional(),
    })).mutation(async ({ input }) => {
      const vendorsList = await db.listVendors();
      const latestMetrics = await db.getLatestMetricsForAllVendors();
      const recentAlerts = await db.listAlerts(false);
      const openTasks = await db.listTasks("todo");

      const systemPrompt = `You are an operations analyst for an Integrity Operations team managing scaled human review vendors. Generate a comprehensive ${input.reportType} status report in markdown format. Include sections for: Executive Summary, Vendor Performance Overview, Key Metrics, Alerts & Issues, Open Action Items, and Recommendations. Be specific with data points provided.`;

      const dataContext = `
Vendors: ${JSON.stringify(vendorsList.map(v => ({ name: v.name, region: v.region, status: v.contractStatus, headcount: v.headcount })))}
Latest Metrics: ${JSON.stringify(latestMetrics)}
Recent Alerts: ${JSON.stringify(recentAlerts.slice(0, 10).map(a => ({ type: a.type, severity: a.severity, title: a.title, resolved: a.isResolved })))}
Open Tasks: ${JSON.stringify(openTasks.slice(0, 10).map(t => ({ title: t.title, priority: t.priority, category: t.category })))}
Additional Context: ${input.context || "None provided"}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate the ${input.reportType} report based on this data:\n${dataContext}` },
        ],
      });

      return { content: result.choices[0]?.message?.content || "Report generation failed." };
    }),

    generateTalkingPoints: protectedProcedure.input(z.object({
      meetingType: z.string(),
      attendee: z.string().optional(),
      vendorId: z.number().optional(),
      previousNotes: z.string().optional(),
      context: z.string().optional(),
    })).mutation(async ({ input }) => {
      let vendorData = "";
      if (input.vendorId) {
        const vendor = await db.getVendor(input.vendorId);
        const metrics = await db.getVendorMetrics(input.vendorId);
        vendorData = `Vendor: ${JSON.stringify(vendor)}\nRecent Metrics: ${JSON.stringify(metrics.slice(-5))}`;
      }

      const systemPrompt = `You are a management coach helping a people manager in Integrity Operations prepare for meetings. Generate structured talking points and an agenda in markdown format. Include: Agenda Items, Key Discussion Points, Data-Driven Talking Points, Questions to Ask, and Follow-up Actions. Be specific and actionable.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate talking points for a ${input.meetingType} meeting.
Attendee: ${input.attendee || "Team member"}
${vendorData}
Previous Notes: ${input.previousNotes || "None"}
Additional Context: ${input.context || "None"}` },
        ],
      });

      return { content: result.choices[0]?.message?.content || "Generation failed." };
    }),

    draftCommunication: protectedProcedure.input(z.object({
      commType: z.string(),
      subject: z.string(),
      context: z.string().optional(),
      tone: z.string().optional(),
      recipients: z.string().optional(),
    })).mutation(async ({ input }) => {
      const systemPrompt = `You are a professional communications specialist for an Integrity Operations team. Draft a ${input.commType} email/communication in markdown format. The tone should be ${input.tone || "professional and clear"}. Include a clear subject line, structured body, and any necessary call-to-action.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Draft a ${input.commType} communication.
Subject: ${input.subject}
Recipients: ${input.recipients || "Not specified"}
Context: ${input.context || "None provided"}` },
        ],
      });

      return { content: result.choices[0]?.message?.content || "Draft generation failed." };
    }),

    generateScorecard: protectedProcedure.input(z.object({
      vendorId: z.number(),
      period: z.string(),
    })).mutation(async ({ input }) => {
      const vendor = await db.getVendor(input.vendorId);
      const metrics = await db.getVendorMetrics(input.vendorId);

      if (!vendor) throw new Error("Vendor not found");

      const systemPrompt = `You are a vendor performance analyst. Generate a vendor scorecard with scores (0-100) and detailed commentary. Return JSON with this exact structure: { "overallScore": number, "accuracyScore": number, "throughputScore": number, "qualityScore": number, "responseTimeScore": number, "commentary": "string", "recommendations": "string" }`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate scorecard for vendor "${vendor.name}" for period "${input.period}".
SLA Targets: Accuracy ${vendor.slaAccuracyTarget}%, Throughput ${vendor.slaThroughputTarget}/hr, Response Time ${vendor.slaResponseTimeTarget}hrs
Recent Metrics: ${JSON.stringify(metrics.slice(-10))}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "scorecard",
            strict: true,
            schema: {
              type: "object",
              properties: {
                overallScore: { type: "number" },
                accuracyScore: { type: "number" },
                throughputScore: { type: "number" },
                qualityScore: { type: "number" },
                responseTimeScore: { type: "number" },
                commentary: { type: "string" },
                recommendations: { type: "string" },
              },
              required: ["overallScore", "accuracyScore", "throughputScore", "qualityScore", "responseTimeScore", "commentary", "recommendations"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");
      return parsed;
    }),

    generateDocument: protectedProcedure.input(z.object({
      docType: z.string(),
      title: z.string(),
      context: z.string().optional(),
      outline: z.string().optional(),
    })).mutation(async ({ input }) => {
      const systemPrompt = `You are a technical writer for an Integrity Operations team. Generate a comprehensive ${input.docType} document in markdown format. The document should be well-structured, detailed, and ready for review. Include appropriate sections, headers, and formatting.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a ${input.docType} document titled "${input.title}".
Outline: ${input.outline || "Use standard structure for this document type"}
Context: ${input.context || "Integrity Operations / Scaled Ops environment managing human review vendors"}` },
        ],
      });

      return { content: result.choices[0]?.message?.content || "Document generation failed." };
    }),

    summarizeMeeting: protectedProcedure.input(z.object({
      notes: z.string(),
      meetingType: z.string().optional(),
      attendees: z.string().optional(),
    })).mutation(async ({ input }) => {
      const systemPrompt = `You are a meeting assistant for an Integrity Operations team. Summarize the meeting notes and extract action items. Return the result in markdown with these sections: Meeting Summary, Key Decisions, Action Items (with owners and deadlines if mentioned), and Follow-up Topics.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Summarize this ${input.meetingType || ""} meeting.
Attendees: ${input.attendees || "Not specified"}
Notes:
${input.notes}` },
        ],
      });

      return { content: result.choices[0]?.message?.content || "Summarization failed." };
    }),

    workforceForecast: protectedProcedure.input(z.object({
      vendorId: z.number().optional(),
      currentVolume: z.number().optional(),
      currentHeadcount: z.number().optional(),
      growthRate: z.number().optional(),
      context: z.string().optional(),
    })).mutation(async ({ input }) => {
      let vendorData = "";
      if (input.vendorId) {
        const vendor = await db.getVendor(input.vendorId);
        const metrics = await db.getVendorMetrics(input.vendorId);
        vendorData = `Vendor: ${JSON.stringify(vendor)}\nHistorical Metrics: ${JSON.stringify(metrics.slice(-20))}`;
      }

      const systemPrompt = `You are a workforce planning analyst for an Integrity Operations team. Based on the data provided, generate a workforce forecast with staffing recommendations. Return JSON with: { "projectedVolume": number, "recommendedHeadcount": number, "assumptions": "string", "recommendations": "string" }`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate workforce forecast.
Current Volume: ${input.currentVolume || "Unknown"}
Current Headcount: ${input.currentHeadcount || "Unknown"}
Expected Growth Rate: ${input.growthRate || "Unknown"}%
${vendorData}
Context: ${input.context || "Standard content moderation operations"}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "forecast",
            strict: true,
            schema: {
              type: "object",
              properties: {
                projectedVolume: { type: "number" },
                recommendedHeadcount: { type: "number" },
                assumptions: { type: "string" },
                recommendations: { type: "string" },
              },
              required: ["projectedVolume", "recommendedHeadcount", "assumptions", "recommendations"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      return JSON.parse(typeof content === "string" ? content : "{}");
    }),

    qualityAnalysis: protectedProcedure.input(z.object({
      vendorId: z.number().optional(),
      context: z.string().optional(),
    })).mutation(async ({ input }) => {
      const allVendors = await db.listVendors();
      let metricsData: any[] = [];

      if (input.vendorId) {
        metricsData = await db.getVendorMetrics(input.vendorId);
      } else {
        const latestMetrics = await db.getLatestMetricsForAllVendors();
        metricsData = latestMetrics;
      }

      const systemPrompt = `You are a quality analytics specialist for an Integrity Operations team. Analyze the provided metrics data and generate insights in markdown format. Include: Quality Overview, Trend Analysis, Anomaly Detection, Root Cause Hypotheses, and Improvement Recommendations. Be data-driven and specific.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze quality metrics.
Vendors: ${JSON.stringify(allVendors.map(v => ({ id: v.id, name: v.name, targets: { accuracy: v.slaAccuracyTarget, throughput: v.slaThroughputTarget } })))}
Metrics Data: ${JSON.stringify(metricsData)}
Context: ${input.context || "Standard integrity operations"}` },
        ],
      });

      return { content: result.choices[0]?.message?.content || "Analysis failed." };
    }),
   }),

  // ─── Notifications ──────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.input(z.object({
      unreadOnly: z.boolean().optional(),
      limit: z.number().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.listNotifications(ctx.user.id, {
        unreadOnly: input?.unreadOnly,
        limit: input?.limit ?? 50,
      });
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user.id);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
    dismiss: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.dismissNotification(input.id, ctx.user.id);
      return { success: true };
    }),
    runSlaCheck: protectedProcedure.mutation(async ({ ctx }) => {
      const breaches = await db.runSlaBreachCheck(ctx.user.id);
      // Push critical breaches to owner out-of-app
      if (breaches.length > 0) {
        const summary = breaches.map(b => `${b.vendorName}: ${b.metric} at ${b.value} (target: ${b.target})`).join("\n");
        await notifyOwner({
          title: `⚠️ Mia Alert: ${breaches.length} SLA Breach${breaches.length > 1 ? "es" : ""} Detected`,
          content: `Mia has detected the following SLA breaches:\n\n${summary}\n\nPlease review in the Integrity Ops dashboard.`,
        }).catch(() => {});
      }
      return { breaches, count: breaches.length };
    }),
    runTaskCheck: protectedProcedure.mutation(async ({ ctx }) => {
      const reminders = await db.runTaskDeadlineCheck(ctx.user.id);
      // Push overdue tasks to owner out-of-app
      const overdue = reminders.filter(r => r.status === "overdue");
      if (overdue.length > 0) {
        const summary = overdue.map(r => `- ${r.taskTitle} (due: ${r.dueDate.toLocaleDateString()})`).join("\n");
        await notifyOwner({
          title: `📌 Mia Reminder: ${overdue.length} Overdue Task${overdue.length > 1 ? "s" : ""}`,
          content: `You have overdue tasks that need attention:\n\n${summary}\n\nPlease review in the task tracker.`,
        }).catch(() => {});
      }
      return { reminders, count: reminders.length };
    }),
  }),
});
export type AppRouter = typeof appRouter;

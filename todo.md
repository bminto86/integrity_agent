# Integrity Ops Agent - Project TODO

- [x] Database schema (vendors, metrics, tasks, meetings, reports, documents, scorecards)
- [x] Design system: light enterprise theme, global CSS, Inter font
- [x] Dashboard layout with sidebar navigation
- [x] Vendor Performance Dashboard with SLA/KPI metrics and alerts
- [x] Automated Report Generator (weekly/monthly status reports)
- [x] 1:1 Meeting Assistant with AI-generated talking points
- [x] Communication Drafter for stakeholder emails and escalations
- [x] Task & Action Item Tracker with reminders and progress monitoring
- [x] Workforce Planning Calculator with volume forecasting
- [x] Quality Analytics Engine with trend detection and anomaly alerts
- [x] Vendor Scorecard Automator with AI commentary
- [x] Document Generator for SOPs and training materials
- [x] Meeting Summarizer with action item extraction
- [x] Alerts page with SLA breach and anomaly management
- [x] Backend tRPC routers for all features
- [x] Vitest tests for core functionality (54 tests passing)

## Phase 2 — Conversational Agent Redesign

- [x] AI persona component with animated avatar visualization
- [x] Speech bubble / conversational UI pattern across all modules
- [x] Conversational Home/Dashboard — agent greets user, proactively surfaces insights
- [x] Data connection toggle infrastructure (enable/disable data sources)
- [x] CSV/Excel import for bulk vendor metrics upload
- [x] Automated SLA breach detection background job with auto-alerts
- [x] Integrate conversational persona into all feature modules
- [x] Tests for new features (57 tests passing)

## Phase 2b — Voice Control

- [x] Voice control: Build useVoiceInput hook using Web Speech API
- [x] Voice control: Add voice input button to Mia component and all AI interaction dialogs
- [x] Voice control: Visual feedback (pulsing mic, waveform) during recording

## Phase 3 — Digital Human Mia

- [x] Animated digital human Mia: Canvas-based face with idle animations (blinking, breathing, micro-movements)
- [x] Text-to-speech voice: Browser-native Web Speech API for Mia to speak responses aloud
- [x] Lip-sync animation: Mouth shapes driven by TTS boundary events for realistic speech
- [x] Expression states: Happy, thinking, concerned, speaking — with smooth transitions
- [x] Ambient idle animations: Head sway, eye movement, breathing for lifelike presence
- [x] Replace static avatar with animated Mia across all pages
- [x] Alerts page: Add Mia persona integration
- [x] VendorDetail page: Add Mia persona integration

## Phase 4 — Hyper-Realistic Mia Avatar

- [x] Generate 5 hyper-realistic avatar options for Mia
- [x] Present options to user for selection
- [x] Integrate selected avatar design into the app

## Phase 5 — Avatar Selection Feature

- [x] Generate male avatar option for diverse mix
- [x] Upload all 6 avatar options to CDN
- [x] Build avatar selection settings page in the app
- [x] Store user's avatar preference in database
- [x] Replace canvas-drawn face with photo-based avatar across all pages
- [x] Set Option 2 as default avatar
- [x] Tests for avatar selection feature (62 tests passing)

## Phase 6 — Proactive Notification System

- [x] Database: Add notifications table for in-app notification history
- [x] Backend: Notification creation helpers and tRPC router (list, markRead, markAllRead, dismiss)
- [x] Backend: SLA breach detection job that auto-creates notifications
- [x] Backend: Task deadline reminder job (overdue + due-soon tasks)
- [x] Backend: Wire notifyOwner for out-of-app push alerts on critical events
- [x] Frontend: Notification bell icon in header with unread badge count
- [x] Frontend: Notification center panel with grouped notifications and Mia commentary
- [x] Frontend: Real-time polling for new notifications (30s interval)
- [x] Frontend: Mia proactive toast alerts for high-severity notifications
- [x] Tests for notification system (74 tests passing)

## Phase 7 — Custom Agent Library

- [x] Viability check: confirmed DB, LLM, and storage all support custom agents
- [x] Database: Add custom_agents table (name, system prompt, avatar, personality, expertise, etc.)
- [x] Database: Add agent_conversations table for chat history per agent
- [x] Backend: CRUD tRPC router for agents (create, list, get, update, delete)
- [x] Backend: Agent chat procedure that invokes LLM with the agent's custom system prompt
- [x] Frontend: Agent Library page with grid/list of custom agents
- [x] Frontend: Create/Edit agent dialog with name, prompt, expertise, personality, avatar selection
- [x] Frontend: Agent avatar settings (reuse existing 6 avatars + allow per-agent selection)
- [x] Frontend: Delete agent with confirmation
- [x] Frontend: Agent chat interface for conversing with a specific agent
- [x] Frontend: Agent detail view showing config and conversation history
- [x] Tests for agent library CRUD and chat (87 tests passing)

## Phase 8 — Smart Mia Chat Widget & UI Refinements

- [x] Rename "Dashboard" to "Main" in sidebar navigation
- [x] Add "Agent Library" nav item to sidebar
- [x] Build backend: Mia smart chat procedure that pulls operational context (vendors, metrics, tasks, alerts) and answers any question via LLM
- [x] Build frontend: Smart chat input in the top Mia greeting widget (text + voice)
- [x] Build frontend: Chat response display with Mia's avatar and speech bubbles
- [x] Tests for Mia smart chat procedure (87 tests passing)

## Phase 9 — Mia Voice Response

- [x] Build useTTS hook for text-to-speech output on Mia's chat replies
- [x] Add voice response toggle button in the chat input bar (speaker icon with tooltip)
- [x] Integrate TTS into Home.tsx so Mia speaks her replies aloud
- [x] Sync voice toggle with user's voiceEnabled setting from AvatarContext

## Phase 10 — Response Style Customization

- [x] Database: Add response style columns to user_settings (tone, verbosity, formality, personality, custom instructions)
- [x] Backend: Include response style in settings.update and agents.create/update input schemas
- [x] Backend: Response style injected into custom agent chat system prompts
- [x] Frontend: Add response style controls to Agent Settings page for Mia (tone picker, verbosity, formality, custom instructions)
- [x] Frontend: Add response style controls to Agent Library create/edit dialog for custom agents
- [x] Optimized browser TTS with smart voice selection (Google/neural voices prioritized)
- [x] Tests passing (87 tests)

## Phase 11 — Persistent Floating Mia Chat

- [x] Build MiaFloatingChat component with animated FAB button and slide-out chat panel
- [x] Chat panel: message history, text input, voice input, TTS toggle, Mia avatar
- [x] Wire to existing mia.chat tRPC procedure for AI responses
- [x] Integrate into DashboardLayout so it appears on every page
- [x] Persist chat history across page navigation within session
- [x] Smooth open/close animations with framer-motion
- [x] Tests verified (87 passing)

## Phase 12 — Voice Quality Optimization

- [x] Rewrite useTTS with aggressive ranked voice scoring (200+ for Google neural, tiered Apple/Microsoft/generic)
- [x] Add natural speech patterns: sentence chunking, varied pacing per chunk, micro-pauses between sentences
- [x] Add voice preview/selector in Agent Settings with play button for each available voice
- [x] Store preferred voice in localStorage with auto-restore
- [x] Clean markdown from text before speaking (strip bold, headers, links, code blocks)
- [x] Tests verified (87 passing)

## Phase 13 — Escalation Orchestration Engine

### Security Model
- [x] Vendor portal tokens: cryptographically secure, time-limited, per-vendor unique tokens
- [x] Token scoping: each token only grants access to that vendor's own escalations (zero cross-vendor visibility)
- [x] IP allowlisting: optional per-vendor IP restrictions for portal access
- [x] Token expiry & rotation: configurable expiry (default 90 days), manual revoke, auto-rotation
- [x] Rate limiting: prevent brute-force token guessing and API abuse
- [x] Audit log: every vendor portal access, response submission, and token event is logged
- [x] Data isolation: vendor responses stored separately, no access to internal metrics or other vendor data
- [x] CORS restrictions: vendor portal endpoints locked to specific origins
- [x] Future-ready: schema designed for SSO/SAML integration with Meta identity providers

### Escalation Rules Engine
- [x] Database: escalation_rules table with multi-condition trigger support (AND/OR logic)
- [x] Database: escalation_cases table for case lifecycle tracking
- [x] Database: vendor_portal_tokens table for secure access management
- [x] Database: vendor_responses table for structured response capture
- [x] Database: escalation_audit_log table for security audit trail
- [x] Backend: Rule evaluation engine that checks metrics against trigger conditions
- [x] Backend: Case creation with auto-generated Mia inquiry using AI
- [x] Backend: Severity escalation on non-response (configurable timeframes)
- [x] Backend: Cooldown periods to prevent alert fatigue

### Vendor Portal
- [x] Public vendor portal pages with token-based authentication (no login required)
- [x] Vendor sees only their escalations with sanitised context (metric breach, timeframe, questions)
- [x] Structured response form: root cause, remediation plan, timeline, evidence upload
- [x] Auto-follow-up on non-response with severity increase
- [x] Vendor-side AI agent builder (simplified Agent Library scoped to escalation context)

### Case Management & Mia Analysis
- [x] Frontend: Escalation rules builder with multi-condition UI
- [x] Frontend: Case management dashboard with timeline view
- [x] Frontend: Vendor portal management (token generation, revocation, IP allowlisting)
- [x] Mia auto-analysis of vendor responses (completeness, quality, pattern matching)
- [x] Resolution verification: check if metrics recovered post-remediation
- [x] Historical pattern detection across escalations
- [x] Tests for escalation engine, vendor portal security, and case management (108 tests passing)

## Phase 14 — Mr Diff Agent

- [x] Create Mr Diff as a pre-seeded agent with grumpy old man persona (Carl from Up)
- [x] System prompt: exhaustive diff review from privacy, security, compliance, operational risk perspectives
- [x] Generate grumpy old man avatar for Mr Diff
- [x] Wire into Agent Library so he appears as a built-in agent
- [x] Tests for Mr Diff agent creation (108 tests passing)

## Phase 15 — GO4Ai Agent

- [x] Create GO4Ai as a pre-seeded built-in agent with Ned Flanders persona
- [x] System prompt: GO AI Skills completion tracking, SQL generation for Meta HR/learning tables
- [x] Generate Ned Flanders-inspired avatar for GO4Ai
- [x] Wire into Agent Library alongside Mr Diff
- [x] Tests passing after addition (108 tests passing)

## Phase 16 — My AI Usage Agent

- [x] Design persona: energetic fitness-trainer-style AI usage coach ("Coach Byte")
- [x] System prompt: weekly AI usage analysis, benchmarking, gap identification, scorecard generation
- [x] Generate avatar for Coach Byte
- [x] Wire into Agent Library alongside Mr Diff and GO4Ai
- [x] Tests passing after addition (108 tests passing)

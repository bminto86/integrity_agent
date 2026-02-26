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

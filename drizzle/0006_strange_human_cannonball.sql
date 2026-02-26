CREATE TABLE `escalation_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventCategory` enum('token_created','token_revoked','token_expired','token_accessed','portal_accessed','response_submitted','ip_blocked','rate_limited','invalid_token','case_exported') NOT NULL,
	`vendorId` int,
	`tokenId` int,
	`caseId` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`details` text,
	`isSecurityEvent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `escalation_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escalation_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int,
	`vendorId` int NOT NULL,
	`caseRef` varchar(32) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'high',
	`status` enum('open','awaiting_vendor','vendor_responded','under_review','resolved','closed','auto_escalated') NOT NULL DEFAULT 'open',
	`inquiryContent` text,
	`triggerData` json,
	`responseDeadline` timestamp,
	`followUpCount` int NOT NULL DEFAULT 0,
	`miaAnalysis` text,
	`resolutionNotes` text,
	`resolvedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escalation_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `escalation_cases_caseRef_unique` UNIQUE(`caseRef`)
);
--> statement-breakpoint
CREATE TABLE `escalation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`conditionLogic` enum('and','or') NOT NULL DEFAULT 'and',
	`conditions` json NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'high',
	`responseDeadlineHours` int NOT NULL DEFAULT 48,
	`followUpIntervalHours` int NOT NULL DEFAULT 24,
	`maxFollowUps` int NOT NULL DEFAULT 3,
	`cooldownHours` int NOT NULL DEFAULT 24,
	`isActive` boolean NOT NULL DEFAULT true,
	`vendorScope` json,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escalation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escalation_timeline` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`eventType` enum('case_created','inquiry_sent','vendor_viewed','vendor_responded','follow_up_sent','severity_escalated','mia_analysis','status_changed','resolution_verified','note_added','token_accessed') NOT NULL,
	`actor` enum('system','user','vendor','mia') NOT NULL DEFAULT 'system',
	`title` varchar(500) NOT NULL,
	`content` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `escalation_timeline_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_ai_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`systemPrompt` text NOT NULL,
	`knowledgeBase` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`managedByTokenId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_ai_agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_portal_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`tokenSuffix` varchar(8) NOT NULL,
	`label` varchar(255),
	`caseScope` json,
	`ipAllowlist` json,
	`expiresAt` timestamp NOT NULL,
	`isRevoked` boolean NOT NULL DEFAULT false,
	`lastAccessedAt` timestamp,
	`accessCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_portal_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_portal_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `vendor_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`vendorId` int NOT NULL,
	`tokenId` int,
	`rootCause` text,
	`remediationPlan` text,
	`timeline` varchar(255),
	`preventionMeasures` text,
	`additionalNotes` text,
	`evidenceUrls` json,
	`isAiAssisted` boolean NOT NULL DEFAULT false,
	`miaResponseAnalysis` text,
	`submitterIp` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_responses_id` PRIMARY KEY(`id`)
);

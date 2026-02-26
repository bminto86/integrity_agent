CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int,
	`type` enum('sla_breach','quality_drop','capacity_warning','anomaly','general') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`title` varchar(500) NOT NULL,
	`description` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`isResolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commType` enum('escalation','status_update','stakeholder_email','vendor_comm','program_update','other') NOT NULL DEFAULT 'other',
	`subject` varchar(500) NOT NULL,
	`content` text,
	`recipients` text,
	`status` enum('draft','sent','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`docType` enum('sop','training','process','policy','template','other') NOT NULL DEFAULT 'other',
	`content` text,
	`version` int DEFAULT 1,
	`status` enum('draft','review','published','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`meetingType` enum('one_on_one','team_sync','vendor_review','qbr','stakeholder','other') NOT NULL DEFAULT 'other',
	`attendees` text,
	`scheduledAt` timestamp,
	`duration` int,
	`agendaItems` text,
	`talkingPoints` text,
	`notes` text,
	`actionItems` text,
	`summary` text,
	`vendorId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`reportType` enum('weekly','monthly','quarterly','custom') NOT NULL DEFAULT 'weekly',
	`content` text,
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`metrics` text,
	`insights` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scorecards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`period` varchar(64) NOT NULL,
	`overallScore` float,
	`accuracyScore` float,
	`throughputScore` float,
	`qualityScore` float,
	`responseTimeScore` float,
	`commentary` text,
	`recommendations` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scorecards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('todo','in_progress','blocked','done') NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`category` enum('vendor_mgmt','quality','workforce','reporting','process','general') NOT NULL DEFAULT 'general',
	`assignee` varchar(255),
	`dueDate` timestamp,
	`vendorId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`date` timestamp NOT NULL,
	`accuracyRate` float,
	`throughput` float,
	`responseTimeHours` float,
	`qualityScore` float,
	`falsePositiveRate` float,
	`falseNegativeRate` float,
	`escalationRate` float,
	`utilizationRate` float,
	`reviewVolume` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`region` varchar(128),
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contractStatus` enum('active','pending','expired','terminated') NOT NULL DEFAULT 'active',
	`slaAccuracyTarget` float DEFAULT 95,
	`slaThroughputTarget` float DEFAULT 100,
	`slaResponseTimeTarget` float DEFAULT 24,
	`headcount` int DEFAULT 0,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workforce_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`vendorId` int,
	`forecastPeriod` varchar(64),
	`projectedVolume` int,
	`recommendedHeadcount` int,
	`currentHeadcount` int,
	`assumptions` text,
	`recommendations` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_plans_id` PRIMARY KEY(`id`)
);

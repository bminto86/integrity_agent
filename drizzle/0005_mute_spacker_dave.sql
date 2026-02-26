ALTER TABLE `custom_agents` ADD `responseTone` varchar(64) DEFAULT 'professional';--> statement-breakpoint
ALTER TABLE `custom_agents` ADD `responseVerbosity` varchar(64) DEFAULT 'balanced';--> statement-breakpoint
ALTER TABLE `custom_agents` ADD `responseFormality` varchar(64) DEFAULT 'conversational';--> statement-breakpoint
ALTER TABLE `custom_agents` ADD `responseCustomInstructions` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `responseTone` varchar(64) DEFAULT 'professional';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `responseVerbosity` varchar(64) DEFAULT 'balanced';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `responseFormality` varchar(64) DEFAULT 'conversational';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `responsePersonality` varchar(500) DEFAULT 'supportive, analytical';--> statement-breakpoint
ALTER TABLE `user_settings` ADD `responseCustomInstructions` text;
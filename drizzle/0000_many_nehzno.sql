CREATE TABLE `friction_clusters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`summary` text NOT NULL,
	`category` text NOT NULL,
	`keywords` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`impact_score` real DEFAULT 0 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`resolved_at` text,
	`resolution_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_friction_clusters_status_impact` ON `friction_clusters` (`status`,`impact_score`);--> statement-breakpoint
CREATE TABLE `friction_events` (
	`id` text PRIMARY KEY NOT NULL,
	`raw_text` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`context` text NOT NULL,
	`estimated_minutes` integer NOT NULL,
	`severity` real DEFAULT 1 NOT NULL,
	`cluster_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cluster_id`) REFERENCES `friction_clusters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_friction_events_cluster_created` ON `friction_events` (`cluster_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `friction_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`recommended_cluster_id` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`recommended_cluster_id`) REFERENCES `friction_clusters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA optimize;

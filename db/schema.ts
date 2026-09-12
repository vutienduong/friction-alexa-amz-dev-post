import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const frictionClusters = sqliteTable(
  "friction_clusters",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    category: text("category").notNull(),
    keywords: text("keywords").notNull(),
    status: text("status").notNull().default("active"),
    impactScore: real("impact_score").notNull().default(0),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    resolvedAt: text("resolved_at"),
    resolutionNote: text("resolution_note"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_friction_clusters_status_impact").on(table.status, table.impactScore)],
);

export const frictionEvents = sqliteTable(
  "friction_events",
  {
    id: text("id").primaryKey(),
    rawText: text("raw_text").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    context: text("context").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    severity: real("severity").notNull().default(1),
    clusterId: text("cluster_id")
      .notNull()
      .references(() => frictionClusters.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_friction_events_cluster_created").on(table.clusterId, table.createdAt)],
);

export const frictionReviews = sqliteTable("friction_reviews", {
  id: text("id").primaryKey(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  recommendedClusterId: text("recommended_cluster_id")
    .notNull()
    .references(() => frictionClusters.id),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

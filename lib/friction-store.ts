import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { frictionClusters, frictionEvents } from "@/db/schema";
import {
  calculateImpact,
  extractFriction,
  findMatchingCluster,
  summarizeProgress,
  type FrictionStatus,
} from "@/lib/friction";

const seededClusters = [
  {
    id: "manual-reporting",
    name: "Manual reporting workflow",
    summary: "Numbers are repeatedly copied between spreadsheets and reports.",
    category: "manual_work",
    keywords: JSON.stringify(["spreadsheet", "report", "numbers", "sheets", "copy", "manual"]),
    status: "active",
    impactScore: 69.6,
  },
  {
    id: "project-information",
    name: "Finding project information",
    summary: "Useful links and documents are scattered across tools.",
    category: "information",
    keywords: JSON.stringify(["slack", "document", "link", "find", "search"]),
    status: "active",
    impactScore: 30,
  },
  {
    id: "agenda-less-meetings",
    name: "Meetings without an agenda",
    summary: "Meetings begin without enough context or a clear outcome.",
    category: "communication",
    keywords: JSON.stringify(["meeting", "agenda", "context"]),
    status: "active",
    impactScore: 48.4,
  },
  {
    id: "expense-submission",
    name: "Forgotten expense submission",
    summary: "Receipts wait until the expense deadline becomes urgent.",
    category: "admin",
    keywords: JSON.stringify(["expense", "submit", "receipt"]),
    status: "active",
    impactScore: 24,
  },
  {
    id: "authentication",
    name: "Repeated authentication",
    summary: "Expired sessions interrupt focused work.",
    category: "digital",
    keywords: JSON.stringify(["password", "login", "session", "sign in"]),
    status: "active",
    impactScore: 36,
  },
] as const;

const seedObservations: Array<[string, string, number, number]> = [
  ["manual-reporting", "Copied the sales numbers into the weekly report again", 12, 3],
  ["project-information", "Searched Slack for the deployment link again", 10, 5],
  ["agenda-less-meetings", "The planning meeting started without an agenda", 22, 7],
  ["manual-reporting", "Updated the revenue spreadsheet manually", 10, 10],
  ["expense-submission", "Forgot to submit my taxi receipt", 8, 16],
  ["authentication", "My admin session expired and I had to sign in again", 9, 20],
  ["project-information", "Could not find the latest project brief", 10, 26],
  ["manual-reporting", "Moved numbers between two sheets again", 12, 31],
  ["authentication", "Reset my password for the analytics tool", 9, 40],
  ["expense-submission", "Had to hunt down another receipt", 8, 47],
  ["agenda-less-meetings", "Another meeting began without context", 22, 52],
  ["manual-reporting", "Copied payroll totals into the report", 12, 60],
  ["project-information", "Looked through bookmarks for the project link", 10, 68],
  ["authentication", "Signed into the dashboard again after session timeout", 9, 76],
  ["expense-submission", "Nearly missed the expense submission again", 8, 84],
  ["authentication", "The console logged me out during a deploy", 9, 92],
  ["manual-reporting", "Rebuilt the weekly sales summary by hand", 12, 100],
];

const advice: Record<string, { rootCause: string; suggestedAction: string }> = {
  manual_work: {
    rootCause: "The source spreadsheet and the report are not connected.",
    suggestedAction: "Automate the spreadsheet-to-report handoff.",
  },
  information: {
    rootCause: "Project knowledge is distributed across too many tools.",
    suggestedAction: "Create one searchable project index.",
  },
  communication: {
    rootCause: "Meeting ownership does not include a preparation checkpoint.",
    suggestedAction: "Require a one-line agenda before a meeting can start.",
  },
  admin: {
    rootCause: "Receipts are captured separately from the submission workflow.",
    suggestedAction: "Create an immediate receipt capture routine.",
  },
  digital: {
    rootCause: "Short session limits repeatedly interrupt the same workflow.",
    suggestedAction: "Review session policy or consolidate sign-in.",
  },
};

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function ensureSeeded() {
  const db = getDb();
  const existing = await db.select({ id: frictionClusters.id }).from(frictionClusters).limit(1);
  if (existing.length) return;

  const now = new Date().toISOString();
  await db.insert(frictionClusters).values(
    seededClusters.map((cluster, index) => ({
      ...cluster,
      firstSeenAt: isoHoursAgo(100 - index),
      lastSeenAt: isoHoursAgo(index * 4 + 3),
    })),
  );

  await db.insert(frictionEvents).values(
    seedObservations.map(([clusterId, rawText, estimatedMinutes, hoursAgo], index) => {
      const cluster = seededClusters.find((item) => item.id === clusterId)!;
      return {
        id: `seed-${index + 1}`,
        rawText,
        title: cluster.name,
        category: cluster.category,
        context: "work",
        estimatedMinutes,
        severity: clusterId === "manual-reporting" ? 1.2 : clusterId === "agenda-less-meetings" ? 1.1 : 1,
        clusterId,
        createdAt: isoHoursAgo(hoursAgo),
      };
    }),
  );
}

export async function getDashboard() {
  await ensureSeeded();
  const db = getDb();
  const [events, clusters] = await Promise.all([
    db.select().from(frictionEvents).orderBy(desc(frictionEvents.createdAt)).limit(40),
    db.select().from(frictionClusters).orderBy(desc(frictionClusters.impactScore)),
  ]);

  const hydrated = clusters.map((cluster) => {
    const related = events.filter((event) => event.clusterId === cluster.id);
    const totalMinutes = related.reduce((sum, event) => sum + event.estimatedMinutes, 0);
    return {
      ...cluster,
      keywords: JSON.parse(cluster.keywords) as string[],
      status: cluster.status as FrictionStatus,
      occurrences: related.length,
      totalMinutes,
      ...advice[cluster.category],
    };
  });
  const recommendation = hydrated.find((cluster) => cluster.status !== "resolved") ?? null;
  const progress = summarizeProgress(hydrated);

  return { events, clusters: hydrated, recommendation, progress };
}

export async function logFriction(rawText: string) {
  await ensureSeeded();
  const db = getDb();
  const extracted = extractFriction(rawText);
  const clusters = await db.select().from(frictionClusters);
  const match = findMatchingCluster(
    rawText,
    clusters.map((cluster) => ({
      id: cluster.id,
      name: cluster.name,
      keywords: JSON.parse(cluster.keywords) as string[],
    })),
  );

  const now = new Date().toISOString();
  const clusterId = match?.id ?? crypto.randomUUID();
  if (!match) {
    await db.insert(frictionClusters).values({
      id: clusterId,
      name: extracted.title,
      summary: "A newly observed friction waiting for more evidence.",
      category: extracted.category,
      keywords: JSON.stringify(extracted.keywords),
      status: "active",
      impactScore: calculateImpact(1, extracted.estimatedMinutes, extracted.severity),
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }

  const event = {
    id: crypto.randomUUID(),
    rawText: rawText.trim(),
    title: extracted.title,
    category: extracted.category,
    context: extracted.context,
    estimatedMinutes: extracted.estimatedMinutes,
    severity: extracted.severity,
    clusterId,
    createdAt: now,
  };
  await db.insert(frictionEvents).values(event);

  const related = await db.select().from(frictionEvents).where(eq(frictionEvents.clusterId, clusterId));
  const totalMinutes = related.reduce((sum, item) => sum + item.estimatedMinutes, 0);
  const impactScore = calculateImpact(related.length, totalMinutes, extracted.severity);
  await db
    .update(frictionClusters)
    .set({ lastSeenAt: now, impactScore, status: "active", resolvedAt: null })
    .where(eq(frictionClusters.id, clusterId));

  return { event, clusterId, repeated: related.length > 1, occurrences: related.length, impactScore };
}

export async function resolveFriction(clusterId: string, resolutionNote: string) {
  const db = getDb();
  const resolvedAt = new Date().toISOString();
  const updated = await db
    .update(frictionClusters)
    .set({ status: "resolved", resolvedAt, resolutionNote: resolutionNote.trim() })
    .where(eq(frictionClusters.id, clusterId))
    .returning();

  if (!updated.length) throw new Error("Friction pattern not found");
  return updated[0];
}

export async function selectFriction(clusterId: string) {
  const db = getDb();
  const updated = await db
    .update(frictionClusters)
    .set({ status: "selected_to_fix" })
    .where(eq(frictionClusters.id, clusterId))
    .returning();
  if (!updated.length) throw new Error("Friction pattern not found");
  return updated[0];
}

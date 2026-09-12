const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

const clusterBase = [
  ["manual-reporting", "Manual reporting workflow", "manual_work", 5, 58, 69.6],
  ["agenda-less-meetings", "Meetings without an agenda", "communication", 2, 44, 48.4],
  ["authentication", "Repeated authentication", "digital", 4, 36, 36],
  ["project-information", "Finding project information", "information", 3, 30, 30],
  ["expense-submission", "Forgotten expense submission", "admin", 3, 24, 24],
] as const;

const details: Record<string, { summary: string; rootCause: string; suggestedAction: string; keywords: string[] }> = {
  manual_work: {
    summary: "Numbers are repeatedly copied between spreadsheets and reports.",
    rootCause: "The source spreadsheet and the report are not connected.",
    suggestedAction: "Automate the spreadsheet-to-report handoff.",
    keywords: ["spreadsheet", "report", "numbers", "copy"],
  },
  communication: {
    summary: "Meetings begin without enough context or a clear outcome.",
    rootCause: "Meeting ownership does not include a preparation checkpoint.",
    suggestedAction: "Require a one-line agenda before a meeting can start.",
    keywords: ["meeting", "agenda", "context"],
  },
  digital: {
    summary: "Expired sessions interrupt focused work.",
    rootCause: "Short session limits repeatedly interrupt the same workflow.",
    suggestedAction: "Review session policy or consolidate sign-in.",
    keywords: ["password", "login", "session"],
  },
  information: {
    summary: "Useful links and documents are scattered across tools.",
    rootCause: "Project knowledge is distributed across too many tools.",
    suggestedAction: "Create one searchable project index.",
    keywords: ["slack", "document", "link", "search"],
  },
  admin: {
    summary: "Receipts wait until the expense deadline becomes urgent.",
    rootCause: "Receipts are captured separately from the submission workflow.",
    suggestedAction: "Create an immediate receipt capture routine.",
    keywords: ["expense", "submit", "receipt"],
  },
};

export function createDemoDashboard() {
  const clusters = clusterBase.map(([id, name, category, occurrences, totalMinutes, impactScore], index) => ({
    id,
    name,
    category,
    occurrences,
    totalMinutes,
    impactScore,
    status: "active" as FrictionStatus,
    firstSeenAt: ago(100),
    lastSeenAt: ago(index * 3 + 2),
    resolvedAt: null,
    resolutionNote: null,
    createdAt: ago(100),
    ...details[category],
  }));

  const events = [
    ["manual-reporting", "Rebuilt the weekly sales summary by hand", "Manual reporting workflow", "manual_work", 12, 2],
    ["project-information", "Searched Slack for the deployment link again", "Finding project information", "information", 10, 5],
    ["agenda-less-meetings", "The planning meeting started without an agenda", "Meetings without an agenda", "communication", 22, 7],
    ["authentication", "My admin session expired during a deploy", "Repeated authentication", "digital", 9, 10],
    ["expense-submission", "Forgot to submit my taxi receipt", "Forgotten expense submission", "admin", 8, 16],
  ].map(([clusterId, rawText, title, category, estimatedMinutes, hours], index) => ({
    id: `preview-${index}`,
    rawText: String(rawText),
    title: String(title),
    category: String(category),
    context: "work",
    estimatedMinutes: Number(estimatedMinutes),
    severity: 1,
    clusterId: String(clusterId),
    createdAt: ago(Number(hours)),
  }));

  return {
    events,
    clusters,
    recommendation: clusters[0],
    progress: {
      patternsFound: 5,
      frictionsLogged: 17,
      minutesWasted: 192,
      minutesSavedWeekly: 0,
      hoursSavedYearly: 0,
    },
  };
}

export type DashboardData = ReturnType<typeof createDemoDashboard>;
import type { FrictionStatus } from "@/lib/friction";

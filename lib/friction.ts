export type FrictionCategory =
  | "manual_work"
  | "communication"
  | "information"
  | "admin"
  | "home"
  | "digital"
  | "other";

export type FrictionContext = "work" | "home" | "personal";
export type FrictionStatus = "active" | "selected_to_fix" | "resolved" | "ignored";

export interface ExtractedFriction {
  title: string;
  category: FrictionCategory;
  context: FrictionContext;
  estimatedMinutes: number;
  severity: number;
  keywords: string[];
}

export interface ClusterCandidate {
  id: string;
  name: string;
  keywords: string[];
}

export interface ProgressCluster {
  status: FrictionStatus;
  occurrences: number;
  totalMinutes: number;
}

const rules: Array<{
  match: string[];
  result: ExtractedFriction;
}> = [
  {
    match: ["spreadsheet", "report", "numbers", "sheets", "copy", "payroll"],
    result: {
      title: "Manual reporting workflow",
      category: "manual_work",
      context: "work",
      estimatedMinutes: 12,
      severity: 1.2,
      keywords: ["spreadsheet", "report", "numbers", "sheets", "copy", "manual"],
    },
  },
  {
    match: ["meeting", "agenda", "context"],
    result: {
      title: "Meetings without an agenda",
      category: "communication",
      context: "work",
      estimatedMinutes: 18,
      severity: 1.1,
      keywords: ["meeting", "agenda", "context"],
    },
  },
  {
    match: ["slack", "document", "link", "find", "search"],
    result: {
      title: "Finding project information",
      category: "information",
      context: "work",
      estimatedMinutes: 7,
      severity: 1,
      keywords: ["slack", "document", "link", "find", "search"],
    },
  },
  {
    match: ["expense", "submit", "receipt"],
    result: {
      title: "Forgotten expense submission",
      category: "admin",
      context: "work",
      estimatedMinutes: 8,
      severity: 1,
      keywords: ["expense", "submit", "receipt"],
    },
  },
  {
    match: ["milk", "grocer", "buy", "shopping"],
    result: {
      title: "Forgotten groceries",
      category: "home",
      context: "home",
      estimatedMinutes: 15,
      severity: 0.9,
      keywords: ["milk", "grocery", "buy", "shopping"],
    },
  },
  {
    match: ["password", "login", "session", "sign in"],
    result: {
      title: "Repeated authentication",
      category: "digital",
      context: "work",
      estimatedMinutes: 6,
      severity: 1,
      keywords: ["password", "login", "session", "sign in"],
    },
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

export function extractFriction(rawText: string): ExtractedFriction {
  const text = normalize(rawText);
  const best = rules
    .map((rule) => ({
      rule,
      score: rule.match.reduce((total, keyword) => total + Number(text.includes(keyword)), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (best && best.score > 0) return { ...best.rule.result };

  const cleaned = rawText
    .replace(/^alexa,?\s*/i, "")
    .replace(/^(log a friction[.:]?|this annoyed me[.:]?|i wasted time[.:]?)\s*/i, "")
    .trim();

  return {
    title: cleaned.length > 54 ? `${cleaned.slice(0, 51)}…` : cleaned || "Uncategorized friction",
    category: "other",
    context: "personal",
    estimatedMinutes: 5,
    severity: 1,
    keywords: normalize(cleaned).split(/\s+/).filter((word) => word.length > 4).slice(0, 5),
  };
}

export function findMatchingCluster(text: string, clusters: ClusterCandidate[]) {
  const normalized = normalize(text);
  return clusters
    .map((cluster) => ({
      cluster,
      score: cluster.keywords.reduce(
        (total, keyword) => total + Number(normalized.includes(normalize(keyword))),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .find((candidate) => candidate.score > 0)?.cluster;
}

export function calculateImpact(occurrences: number, totalMinutes: number, severity: number) {
  if (occurrences <= 0 || totalMinutes <= 0) return 0;
  return Math.round(totalMinutes * severity * 10) / 10;
}

export function summarizeProgress(clusters: ProgressCluster[]) {
  const frictionsLogged = clusters.reduce((sum, cluster) => sum + cluster.occurrences, 0);
  const minutesWasted = clusters.reduce((sum, cluster) => sum + cluster.totalMinutes, 0);
  const minutesSavedWeekly = clusters
    .filter((cluster) => cluster.status === "resolved")
    .reduce((sum, cluster) => sum + cluster.totalMinutes, 0);

  return {
    patternsFound: clusters.length,
    frictionsLogged,
    minutesWasted,
    minutesSavedWeekly,
    hoursSavedYearly: Math.round((minutesSavedWeekly * 52) / 6) / 10,
  };
}

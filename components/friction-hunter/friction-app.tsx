"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleDot,
  Command,
  Gauge,
  History,
  Lightbulb,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardData } from "@/lib/demo-dashboard";

type Message = { role: "user" | "alexa"; text: string };

const quickPrompts = [
  "I had to copy the sales report manually again.",
  "What friction should I fix this week?",
  "I automated it. Mark it resolved.",
];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function categoryLabel(value: string) {
  return value.replace("manual_work", "manual work").replaceAll("_", " ");
}

export function FrictionApp({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [messages, setMessages] = useState<Message[]>([
    { role: "alexa", text: "I'm listening for the small things that keep getting in your way." },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  const topImpact = data.clusters[0]?.impactScore || 1;
  const recommendation = data.recommendation;
  const resolved = data.clusters.filter((cluster) => cluster.status === "resolved").length;

  const refresh = useCallback(async () => {
    const response = await fetch("/api/frictions", { cache: "no-store" });
    if (!response.ok) throw new Error("Live storage is unavailable. The demo data is still visible.");
    setData((await response.json()) as DashboardData);
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submitFriction = useCallback(async (description: string) => {
    const response = await fetch("/api/frictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    if (!response.ok) throw new Error("I couldn't save that yet. Please try once more.");
    const payload = (await response.json()) as {
      result: { repeated: boolean; occurrences: number };
      dashboard: DashboardData;
    };
    setData(payload.dashboard);
    return payload.result;
  }, []);

  const resolveTopFriction = useCallback(async (note = "Automated the spreadsheet-to-report workflow") => {
    if (!recommendation) return;
    const response = await fetch(`/api/frictions/${recommendation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved", resolutionNote: note }),
    });
    if (!response.ok) throw new Error("I couldn't mark that friction resolved.");
    await refresh();
  }, [recommendation, refresh]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<NonNullable<typeof context.registerTool>>[0]) =>
      Promise.resolve(context.registerTool!(tool, { signal: lifecycle.signal })).catch(() => undefined);

    void register({
      name: "log_friction",
      title: "Log friction",
      description: "Capture a natural-language friction and update the visible pattern analysis.",
      inputSchema: {
        type: "object",
        properties: { description: { type: "string", minLength: 1, maxLength: 500 } },
        required: ["description"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: unknown) => {
        const description = (input as { description?: unknown })?.description;
        if (typeof description !== "string" || !description.trim()) throw new Error("description is required");
        const result = await submitFriction(description);
        return { logged: true, repeated: result.repeated, occurrences: result.occurrences };
      },
    });

    void register({
      name: "recommend_friction_to_fix",
      title: "Recommend a friction",
      description: "Return the single highest-impact unresolved friction visible in the app.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async () => ({ recommendation: data.recommendation }),
    });

    void register({
      name: "resolve_recommended_friction",
      title: "Resolve recommended friction",
      description: "Mark the current highest-impact friction as resolved and update the visible savings.",
      inputSchema: {
        type: "object",
        properties: { resolution_note: { type: "string", minLength: 1, maxLength: 500 } },
        required: ["resolution_note"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: unknown) => {
        const note = (input as { resolution_note?: unknown })?.resolution_note;
        if (typeof note !== "string" || !note.trim()) throw new Error("resolution_note is required");
        await resolveTopFriction(note);
        return { resolved: true, frictionId: data.recommendation?.id };
      },
    });

    return () => lifecycle.abort();
  }, [data.recommendation, resolveTopFriction, submitFriction]);

  async function runCommand(text = draft) {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setNotice("");
    setDraft("");
    setMessages((current) => [...current, { role: "user", text: value }]);

    try {
      const normalized = value.toLowerCase();
      if (normalized.includes("what friction") || normalized.includes("what should i fix")) {
        const top = data.recommendation;
        setMessages((current) => [
          ...current,
          {
            role: "alexa",
            text: top
              ? `${top.name} is your highest-impact recurring friction. It happened ${top.occurrences} times and cost about ${top.totalMinutes} minutes. ${top.suggestedAction}`
              : "You have no unresolved recurring friction right now.",
          },
        ]);
      } else if (normalized.includes("mark it") || normalized.includes("resolved") || normalized.includes("automated it")) {
        await resolveTopFriction();
        setMessages((current) => [
          ...current,
          { role: "alexa", text: "Done. I'll watch whether that friction appears again." },
        ]);
      } else if (normalized.includes("what frictions") || normalized.includes("logged today")) {
        const names = data.events.slice(0, 3).map((event) => event.title.toLowerCase());
        setMessages((current) => [
          ...current,
          { role: "alexa", text: `Your latest frictions were ${names.join(", ")}.` },
        ]);
      } else {
        const result = await submitFriction(value);
        setMessages((current) => [
          ...current,
          {
            role: "alexa",
            text: result.repeated
              ? `Logged. That's occurrence ${result.occurrences} of a pattern I'm already tracking.`
              : "Logged. I'll watch for this pattern.",
          },
        ]);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Something went wrong.";
      setNotice(text);
      setMessages((current) => [...current, { role: "alexa", text }]);
    } finally {
      setBusy(false);
    }
  }

  const annualSavings = useMemo(
    () => Math.round((data.progress.minutesSavedWeekly * 52) / 60),
    [data.progress.minutesSavedWeekly],
  );

  return (
    <main className="app-shell min-h-screen bg-background text-foreground">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Friction Hunter home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>FRICTION<span className="text-primary">/</span>HUNTER</span>
        </a>
        <div className="topbar-status" aria-label="System status">
          <span className="status-light" />
          MCP listening
          <span className="topbar-separator" />
          Week 37
        </div>
      </header>

      <aside className="side-rail" aria-label="Primary navigation">
        <nav>
          <a className="nav-item active" href="#pulse"><Gauge size={17} /> Pulse</a>
          <a className="nav-item" href="#patterns"><CircleDot size={17} /> Patterns</a>
          <a className="nav-item" href="#history"><History size={17} /> History</a>
        </nav>
        <div className="rail-note">
          <Sparkles size={16} />
          <p>17 small interruptions became 5 patterns this week.</p>
        </div>
      </aside>

      <section className="workspace" id="top">
        <div className="workspace-heading" id="pulse">
          <div>
            <p className="eyebrow">Saturday, September 12</p>
            <h1>Your friction pulse</h1>
          </div>
          <p className="sync-label"><RotateCcw size={14} /> Updated just now</p>
        </div>

        <section className="metric-strip" aria-label="This week's friction summary">
          <div><strong>{data.progress.frictionsLogged}</strong><span>events logged</span></div>
          <div><strong>{data.progress.patternsFound}</strong><span>recurring patterns</span></div>
          <div><strong>{formatDuration(data.progress.minutesWasted)}</strong><span>estimated waste</span></div>
          <div><strong>{resolved}</strong><span>frictions fixed</span></div>
        </section>

        {recommendation ? (
          <section className="priority-section" aria-labelledby="priority-title">
            <div className="section-kicker"><Target size={16} /> Fix this next</div>
            <div className="priority-grid">
              <div>
                <h2 id="priority-title">{recommendation.name}</h2>
                <p className="priority-summary">{recommendation.summary}</p>
                <div className="evidence-line">
                  <span>{recommendation.occurrences} occurrences</span>
                  <span>{recommendation.totalMinutes} min this week</span>
                  <span>impact {Math.round(recommendation.impactScore)}</span>
                </div>
              </div>
              <div className="action-brief">
                <p><span>Likely cause</span>{recommendation.rootCause}</p>
                <p><span>Smallest fix</span>{recommendation.suggestedAction}</p>
                <Button className="primary-action" onClick={() => void runCommand("I automated it. Mark it resolved.")}>Fix this friction <ArrowRight size={16} /></Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="all-clear"><Check size={20} /><div><h2>No active patterns</h2><p>Keep logging. I’ll surface the next pattern when there is enough evidence.</p></div></section>
        )}

        {data.progress.minutesSavedWeekly > 0 && (
          <section className="savings-banner" aria-live="polite">
            <Check size={18} />
            <div><strong>Friction eliminated</strong><span>Estimated saving: {formatDuration(data.progress.minutesSavedWeekly)} per week · {annualSavings} hours per year</span></div>
          </section>
        )}

        <section className="patterns-section" id="patterns" aria-labelledby="patterns-title">
          <div className="section-heading-row">
            <div><p className="eyebrow">Signal over noise</p><h2 id="patterns-title">Recurring patterns</h2></div>
            <span>Impact / 100</span>
          </div>
          <div className="pattern-list">
            {data.clusters.map((cluster, index) => (
              <article className={`pattern-row ${cluster.status === "resolved" ? "is-resolved" : ""}`} key={cluster.id}>
                <span className="pattern-rank">0{index + 1}</span>
                <div className="pattern-main">
                  <div className="pattern-title-line"><h3>{cluster.name}</h3><span>{categoryLabel(cluster.category)}</span></div>
                  <div className="impact-track" aria-label={`Impact score ${Math.round(cluster.impactScore)}`}>
                    <span style={{ width: `${Math.max(8, (cluster.impactScore / topImpact) * 100)}%` }} />
                  </div>
                </div>
                <div className="pattern-stat"><strong>{cluster.occurrences}×</strong><span>this week</span></div>
                <div className="pattern-stat"><strong>{cluster.totalMinutes}m</strong><span>lost</span></div>
                <span className="pattern-score">{Math.round(cluster.impactScore)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="history-section" id="history" aria-labelledby="history-title">
          <div className="section-heading-row"><div><p className="eyebrow">Captured ambiently</p><h2 id="history-title">Recent friction</h2></div><span>Latest 5</span></div>
          <div className="event-list">
            {data.events.slice(0, 5).map((event) => (
              <div className="event-row" key={event.id}>
                <time dateTime={event.createdAt}>{formatTime(event.createdAt)}</time>
                <span className="event-dot" />
                <div><strong>{event.rawText}</strong><span>{categoryLabel(event.category)} · ~{event.estimatedMinutes} min</span></div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="alexa-panel" aria-label="Alexa simulator">
        <div className="alexa-header">
          <div><p className="eyebrow">Alexa+ simulator</p><h2>Say what got in your way.</h2></div>
          <span className="live-badge">Live</span>
        </div>

        <div className="voice-stage" aria-hidden="true">
          <div className={`voice-orbit ${busy ? "is-listening" : ""}`}>
            <span className="orbit-ring ring-one" />
            <span className="orbit-ring ring-two" />
            <div className="voice-core"><Mic size={26} /></div>
          </div>
          <p>{busy ? "Understanding…" : "Ready in under 10 seconds"}</p>
        </div>

        <div className="transcript" ref={transcriptRef} aria-live="polite">
          {messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              <span>{message.role === "alexa" ? "A" : "You"}</span>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <form className="command-box" onSubmit={(event) => { event.preventDefault(); void runCommand(); }}>
          <Textarea
            aria-label="Talk to Alexa simulator"
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void runCommand();
              }
            }}
            placeholder="Alexa, log a friction…"
            value={draft}
          />
          <Button aria-label="Send command" className="send-button" disabled={!draft.trim() || busy} size="icon" type="submit"><Send size={17} /></Button>
          <span className="command-hint"><Command size={12} /> Enter to send</span>
        </form>
        {notice && <p className="error-note" role="alert">{notice}</p>}

        <div className="prompt-list" aria-label="Demo prompts">
          <p>Try the complete loop</p>
          {quickPrompts.map((prompt) => (
            <button key={prompt} onClick={() => void runCommand(prompt)} type="button"><span>“{prompt}”</span><ArrowRight size={14} /></button>
          ))}
        </div>

        <div className="mcp-note"><Lightbulb size={15} /><span>The same actions are exposed at <code>/api/mcp</code></span></div>
      </aside>
    </main>
  );
}

declare global {
  interface Document {
    readonly modelContext?: {
      registerTool?: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema: object;
          annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
          execute: (input: unknown) => unknown | Promise<unknown>;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

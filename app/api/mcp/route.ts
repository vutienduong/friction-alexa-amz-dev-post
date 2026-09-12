import {
  getDashboard,
  logFriction,
  resolveFriction,
} from "@/lib/friction-store";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
};

const tools = [
  {
    name: "log_friction",
    description: "Capture a natural-language friction and add it to recurring pattern analysis.",
    inputSchema: {
      type: "object",
      properties: { description: { type: "string", minLength: 1, maxLength: 500 } },
      required: ["description"],
      additionalProperties: false,
    },
  },
  {
    name: "list_frictions",
    description: "List recent friction observations, optionally filtered by period or pattern status.",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "recent"] },
        status: { type: "string", enum: ["active", "selected_to_fix", "resolved", "ignored"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_friction_patterns",
    description: "Return recurring friction clusters ordered by impact.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "recommend_friction_to_fix",
    description: "Return the single highest-impact unresolved friction and a suggested next action.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "resolve_friction",
    description: "Mark a recurring friction as resolved and record what changed.",
    inputSchema: {
      type: "object",
      properties: {
        friction_id: { type: "string", minLength: 1 },
        resolution_note: { type: "string", minLength: 1, maxLength: 500 },
      },
      required: ["friction_id", "resolution_note"],
      additionalProperties: false,
    },
  },
  {
    name: "get_progress",
    description: "Return counts, recurring patterns, and estimated time saved.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
];

function rpc(id: JsonRpcRequest["id"], result: unknown, status = 200) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result }, { status });
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string, status = 400) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status });
}

function toolResult(value: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function originIsAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!originIsAllowed(request)) return rpcError(null, -32000, "Origin not allowed", 403);

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  if (body.jsonrpc !== "2.0" || !body.method) return rpcError(body.id, -32600, "Invalid Request");

  try {
    if (body.method === "server/discover") {
      return rpc(body.id, {
        protocolVersion: "2026-07-28",
        serverInfo: { name: "friction-hunter", version: "1.0.0" },
        capabilities: { tools: {} },
      });
    }
    if (body.method === "initialize") {
      return rpc(body.id, {
        protocolVersion: "2025-11-25",
        serverInfo: { name: "friction-hunter", version: "1.0.0" },
        capabilities: { tools: {} },
      });
    }
    if (body.method === "tools/list") return rpc(body.id, { tools });
    if (body.method !== "tools/call") return rpcError(body.id, -32601, "Method not found");

    const name = body.params?.name;
    const args = body.params?.arguments ?? {};
    const dashboard = await getDashboard();

    if (name === "log_friction") {
      const description = typeof args.description === "string" ? args.description.trim() : "";
      if (!description) return rpcError(body.id, -32602, "description is required");
      return rpc(body.id, toolResult(await logFriction(description)));
    }
    if (name === "list_frictions") {
      const status = typeof args.status === "string" ? args.status : null;
      const period = typeof args.period === "string" ? args.period : "recent";
      const cutoff = new Date();
      cutoff.setHours(period === "today" ? 0 : cutoff.getHours() - (period === "week" ? 168 : 720), 0, 0, 0);
      const clusterStatus = new Map(dashboard.clusters.map((cluster) => [cluster.id, cluster.status]));
      const events = dashboard.events.filter(
        (event) => new Date(event.createdAt) >= cutoff && (!status || clusterStatus.get(event.clusterId) === status),
      );
      return rpc(body.id, toolResult(events));
    }
    if (name === "get_friction_patterns") return rpc(body.id, toolResult(dashboard.clusters));
    if (name === "recommend_friction_to_fix") return rpc(body.id, toolResult(dashboard.recommendation));
    if (name === "get_progress") return rpc(body.id, toolResult(dashboard.progress));
    if (name === "resolve_friction") {
      const frictionId = typeof args.friction_id === "string" ? args.friction_id : "";
      const note = typeof args.resolution_note === "string" ? args.resolution_note : "";
      if (!frictionId || !note) return rpcError(body.id, -32602, "friction_id and resolution_note are required");
      return rpc(body.id, toolResult(await resolveFriction(frictionId, note)));
    }

    return rpcError(body.id, -32602, "Unknown tool");
  } catch (error) {
    console.error("mcp.request.failed", error);
    return rpcError(body.id, -32603, error instanceof Error ? error.message : "Internal error", 500);
  }
}

export async function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

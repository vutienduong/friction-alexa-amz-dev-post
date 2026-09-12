import { resolveFriction, selectFriction } from "@/lib/friction-store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      status?: "selected_to_fix" | "resolved";
      resolutionNote?: string;
    };

    if (payload.status === "selected_to_fix") {
      return Response.json({ cluster: await selectFriction(id) });
    }

    if (payload.status === "resolved") {
      const note = payload.resolutionNote?.trim() ?? "Resolved through a better workflow";
      return Response.json({ cluster: await resolveFriction(id, note) });
    }

    return Response.json({ error: "Unsupported status transition." }, { status: 400 });
  } catch (error) {
    console.error("frictions.patch.failed", error);
    const detail = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: detail }, { status: detail.includes("not found") ? 404 : 503 });
  }
}

import { resolveFriction, selectFriction } from "@/lib/friction-store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 4_096) {
      return Response.json({ error: "Request is too large." }, { status: 413 });
    }
    const { id } = await context.params;
    const payload = (await request.json()) as {
      status?: "selected_to_fix" | "resolved";
      resolutionNote?: string;
    };

    if (!id || id.length > 100) {
      return Response.json({ error: "Invalid friction id." }, { status: 400 });
    }

    if (payload.status === "selected_to_fix") {
      return Response.json({ cluster: await selectFriction(id) });
    }

    if (payload.status === "resolved") {
      const note = payload.resolutionNote?.trim() ?? "Resolved through a better workflow";
      if (!note || note.length > 500) {
        return Response.json({ error: "Resolution note must be between 1 and 500 characters." }, { status: 400 });
      }
      return Response.json({ cluster: await resolveFriction(id, note) });
    }

    return Response.json({ error: "Unsupported status transition." }, { status: 400 });
  } catch (error) {
    console.error("frictions.patch.failed", error);
    const notFound = error instanceof Error && error.message.includes("not found");
    return Response.json(
      { error: notFound ? "Friction pattern not found." : "Friction data is temporarily unavailable." },
      { status: notFound ? 404 : 503 },
    );
  }
}

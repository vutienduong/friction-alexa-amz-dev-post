import { getDashboard, logFriction } from "@/lib/friction-store";

function message(error: unknown) {
  const detail = error instanceof Error ? error.message : "Unexpected error";
  return detail.includes("no such table")
    ? "Friction data is not ready yet. Apply the D1 migration and try again."
    : detail;
}

export async function GET() {
  try {
    return Response.json(await getDashboard());
  } catch (error) {
    console.error("frictions.get.failed", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { description?: string };
    const description = payload.description?.trim() ?? "";
    if (!description || description.length > 500) {
      return Response.json(
        { error: "Description must be between 1 and 500 characters." },
        { status: 400 },
      );
    }

    const result = await logFriction(description);
    return Response.json({ result, dashboard: await getDashboard() }, { status: 201 });
  } catch (error) {
    console.error("frictions.post.failed", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sandboxId = searchParams.get('id');

    if (!sandboxId) {
      return new Response(
        JSON.stringify({ error: "Sandbox ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.DAYTONA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "DAYTONA_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Checking status for sandbox: ${sandboxId}`);

    // Dynamic import to avoid ESM issues during build
    const { Daytona } = await import('@daytonaio/sdk');

    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
    });

    // Get all sandboxes and log them for debugging
    const sandboxes = await daytona.list();
    console.log(`[API] Found ${sandboxes.length} total sandboxes`);
    console.log(`[API] Available sandbox IDs:`, sandboxes.map((s: any) => s.id));

    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);

    if (!sandbox) {
      console.log(`[API] Sandbox ${sandboxId} not found in available sandboxes`);
      return new Response(
        JSON.stringify({
          error: "Sandbox not found",
          status: "not_found",
          isOnline: false,
          availableSandboxes: sandboxes.length,
          searchedId: sandboxId
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const isOnline = sandbox.state === 'started' || sandbox.state === 'running';
    let previewUrl = null;

    // If sandbox is running, try to get preview URL
    if (isOnline) {
      try {
        const preview = await sandbox.getPreviewLink(3000);
        previewUrl = preview?.url || null;
      } catch (error) {
        console.log(`[API] Could not get preview URL for ${sandboxId}:`, error);
      }
    }

    console.log(`[API] Sandbox ${sandboxId} status: ${sandbox.state}, isOnline: ${isOnline}`);

    return new Response(
      JSON.stringify({
        sandboxId: sandboxId,
        status: sandbox.state,
        isOnline: isOnline,
        previewUrl: previewUrl,
        success: true
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[API] Error checking sandbox status:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to check sandbox status",
        status: "error",
        isOnline: false
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  console.log(`[API] Status check started at ${new Date().toISOString()}`);

  try {
    const { searchParams } = new URL(req.url);
    const sandboxId = searchParams.get('id');
    console.log(`[API] Request URL: ${req.url}`);
    console.log(`[API] Requested sandbox ID: ${sandboxId}`);

    if (!sandboxId) {
      console.log('[API] Error: No sandbox ID provided');
      return new Response(
        JSON.stringify({ error: "Sandbox ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check environment variables
    const hasApiKey = !!process.env.DAYTONA_API_KEY;
    const apiKeyLength = process.env.DAYTONA_API_KEY?.length || 0;
    const apiKeyFirst4 = process.env.DAYTONA_API_KEY?.substring(0, 4) || 'none';
    console.log(`[API] Environment check:`);
    console.log(`[API] - DAYTONA_API_KEY present: ${hasApiKey}`);
    console.log(`[API] - API key length: ${apiKeyLength}`);
    console.log(`[API] - API key starts with: ${apiKeyFirst4}...`);
    console.log(`[API] - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[API] - Platform: ${process.platform}`);
    console.log(`[API] - Runtime: ${typeof process !== 'undefined' ? 'Node.js' : 'Browser'}`);

    if (!process.env.DAYTONA_API_KEY) {
      console.log('[API] Error: DAYTONA_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: "DAYTONA_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Checking status for sandbox: ${sandboxId}`);

    // Load Daytona SDK with webpack configuration handling ES modules
    console.log('[API] Loading Daytona SDK (with webpack ES module fixes)...');

    const { Daytona } = await import('@daytonaio/sdk');
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY!,
    });

    console.log('[API] Daytona SDK loaded successfully');

    // Get all sandboxes and log them for debugging
    console.log('[API] Attempting to list sandboxes using original SDK...');
    const listStartTime = Date.now();
    const sandboxes = await daytona.list();
    const listDuration = Date.now() - listStartTime;
    console.log(`[API] Sandboxes listed successfully in ${listDuration}ms`);
    console.log(`[API] Found ${sandboxes.length} total sandboxes`);
    console.log(`[API] Available sandbox IDs:`, sandboxes.map((s: any) => s.id));

    console.log(`[API] Searching for sandbox with ID: ${sandboxId}`);
    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);

    if (!sandbox) {
      console.log(`[API] Sandbox ${sandboxId} not found in available sandboxes`);
      console.log(`[API] Available sandboxes:`, sandboxes.map((s: any) => ({
        id: s.id,
        name: s.name || 'unnamed',
        state: s.state
      })));
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

    console.log(`[API] Found sandbox: ${JSON.stringify({
      id: sandbox.id,
      name: (sandbox as any).name || 'unnamed',
      state: sandbox.state,
      created: sandbox.createdAt
    })}`);

    const isOnline = sandbox.state === 'started';
    let previewUrl = null;

    // If sandbox is running, try to get preview URL
    if (isOnline) {
      try {
        console.log(`[API] Sandbox is online, attempting to get preview URL...`);
        const previewStartTime = Date.now();

        const preview = await sandbox.getPreviewLink(3000);

        const previewDuration = Date.now() - previewStartTime;
        previewUrl = preview?.url || null;
        console.log(`[API] Preview URL retrieved in ${previewDuration}ms: ${previewUrl}`);
      } catch (error: any) {
        console.log(`[API] Could not get preview URL for ${sandboxId}:`, {
          message: error.message,
          code: error.code,
          stack: error.stack?.split('\n')[0]
        });
      }
    } else {
      console.log(`[API] Sandbox is not online (state: ${sandbox.state}), skipping preview URL`);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[API] Status check completed in ${totalDuration}ms`);
    console.log(`[API] Final result: ${JSON.stringify({
      sandboxId,
      status: sandbox.state,
      isOnline,
      previewUrl: previewUrl ? '[URL_SET]' : null
    })}`);

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
    const totalDuration = Date.now() - startTime;
    console.error(`[API] Error checking sandbox status after ${totalDuration}ms:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      stack: error.stack
    });

    // Log additional context for debugging
    console.error(`[API] Error context:`, {
      hasApiKey: !!process.env.DAYTONA_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to check sandbox status",
        status: "error",
        isOnline: false,
        errorDetails: {
          name: error.name,
          code: error.code,
          duration: totalDuration
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
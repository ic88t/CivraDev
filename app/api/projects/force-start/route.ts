import { NextRequest } from "next/server";
import { DaytonaClient, createSandboxWrapper } from "@/lib/daytona-client";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log(`[FORCE-START] Force start request started at ${new Date().toISOString()}`);

  try {
    console.log('[FORCE-START] Parsing request body...');
    const { sandboxId } = await req.json();
    console.log(`[FORCE-START] Request for sandbox ID: ${sandboxId}`);

    if (!sandboxId) {
      console.log('[FORCE-START] Error: No sandbox ID provided');
      return new Response(
        JSON.stringify({ error: "Sandbox ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check environment variables
    const hasApiKey = !!process.env.DAYTONA_API_KEY;
    const apiKeyLength = process.env.DAYTONA_API_KEY?.length || 0;
    const apiKeyFirst4 = process.env.DAYTONA_API_KEY?.substring(0, 4) || 'none';
    console.log(`[FORCE-START] Environment check:`);
    console.log(`[FORCE-START] - DAYTONA_API_KEY present: ${hasApiKey}`);
    console.log(`[FORCE-START] - API key length: ${apiKeyLength}`);
    console.log(`[FORCE-START] - API key starts with: ${apiKeyFirst4}...`);
    console.log(`[FORCE-START] - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[FORCE-START] - Platform: ${process.platform}`);
    console.log(`[FORCE-START] - Runtime: ${typeof process !== 'undefined' ? 'Node.js' : 'Browser'}`);

    if (!process.env.DAYTONA_API_KEY) {
      console.log('[FORCE-START] Error: DAYTONA_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: "DAYTONA_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[FORCE-START] Force starting sandbox: ${sandboxId}`);

    // Use our custom Daytona client instead of the problematic SDK
    console.log('[FORCE-START] Initializing custom Daytona client...');
    const daytona = new DaytonaClient({
      apiKey: process.env.DAYTONA_API_KEY!,
    });
    console.log('[FORCE-START] Custom Daytona client initialized');

    // Get sandbox details
    console.log('[FORCE-START] Listing sandboxes to find target...');
    const listStartTime = Date.now();
    const sandboxes = await daytona.list();
    const listDuration = Date.now() - listStartTime;
    console.log(`[FORCE-START] Sandboxes listed in ${listDuration}ms, found ${sandboxes.length} total sandboxes`);

    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);
    console.log(`[FORCE-START] Target sandbox search result: ${sandbox ? 'found' : 'not found'}`);

    if (sandbox) {
      console.log(`[FORCE-START] Sandbox details: ${JSON.stringify({
        id: (sandbox as any).id,
        name: (sandbox as any).name || 'unnamed',
        state: (sandbox as any).state,
        status: (sandbox as any).status
      })}`);
    }

    if (!sandbox) {
      return new Response(
        JSON.stringify({ error: "Sandbox not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[FORCE-START] Current sandbox status: ${(sandbox as any).status || 'unknown'}`);

    // Try multiple approaches to start the sandbox
    let startSuccess = false;
    let lastError = null;

    // Create a wrapper for the sandbox to maintain compatibility
    const sandboxWrapper = createSandboxWrapper(sandbox, daytona);

    // Approach 1: Regular start
    try {
      console.log(`[FORCE-START] Trying regular start...`);
      await sandboxWrapper.start();
      startSuccess = true;
      console.log(`[FORCE-START] Regular start command sent`);
    } catch (error) {
      console.log(`[FORCE-START] Regular start failed: ${error}`);
      lastError = error;
    }

    // Approach 2: Try alternative start methods (if regular start fails)
    if (!startSuccess) {
      try {
        console.log(`[FORCE-START] Trying alternative start methods...`);

        // Try start again with our client
        await daytona.startSandbox(sandboxId);
        startSuccess = true;
        console.log(`[FORCE-START] Alternative start method succeeded`);
      } catch (error) {
        console.log(`[FORCE-START] Alternative methods failed: ${error}`);
        lastError = error;
      }
    }

    if (!startSuccess) {
      return new Response(
        JSON.stringify({ 
          error: `All start methods failed: ${lastError}`,
          sandboxId: sandboxId,
          availableMethods: Object.getOwnPropertyNames(sandbox)
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Wait longer and check more thoroughly
    console.log(`[FORCE-START] Waiting for sandbox to fully initialize...`);
    let attempts = 0;
    const maxAttempts = 50; // 150 seconds total
    let runningSandbox = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

      try {
        // Get updated sandbox status
        const updatedSandboxes = await daytona.list();
        const updatedSandbox = updatedSandboxes?.find((s: any) => s.id === sandboxId);

        console.log(`[FORCE-START] Attempt ${attempts + 1}/${maxAttempts}: Status = ${(updatedSandbox as any)?.status}`);

        if ((updatedSandbox as any)?.status === 'running') {
          // Try to get preview link multiple times
          for (let previewAttempt = 0; previewAttempt < 5; previewAttempt++) {
            try {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
              const testPreview = await daytona.getPreviewLink(sandboxId, 3000);

              if (testPreview?.url) {
                console.log(`[FORCE-START] SUCCESS! Preview URL obtained: ${testPreview.url}`);
                runningSandbox = updatedSandbox;
                break;
              } else {
                console.log(`[FORCE-START] Preview attempt ${previewAttempt + 1}/5: No URL yet`);
              }
            } catch (previewError) {
              console.log(`[FORCE-START] Preview attempt ${previewAttempt + 1}/5 failed: ${previewError}`);
            }
          }
          
          if (runningSandbox) break;
        }
      } catch (error) {
        console.log(`[FORCE-START] Status check error: ${error}`);
      }

      attempts++;
    }

    if (!runningSandbox) {
      return new Response(
        JSON.stringify({ 
          error: `Sandbox failed to fully start after ${maxAttempts * 3} seconds`,
          sandboxId: sandboxId,
          note: "Sandbox may be starting but not getting IP address"
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    // Get final preview URL
    const preview = await daytona.getPreviewLink(sandboxId, 3000);

    return new Response(
      JSON.stringify({ 
        success: true,
        status: 'running',
        previewUrl: preview?.url || null,
        sandboxId: sandboxId,
        note: "Force start successful"
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[FORCE-START] Error force starting sandbox after ${totalDuration}ms:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      stack: error.stack
    });

    // Log additional context for debugging
    console.error(`[FORCE-START] Error context:`, {
      hasApiKey: !!process.env.DAYTONA_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to force start sandbox",
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




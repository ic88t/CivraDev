import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { sandboxId } = await req.json();

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

    console.log(`[FORCE-START] Force starting sandbox: ${sandboxId}`);

    // Dynamic import to avoid ESM issues during build
    const { Daytona } = await import('@daytonaio/sdk');
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
    });

    // Get sandbox details
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);

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

    // Approach 1: Regular start
    try {
      console.log(`[FORCE-START] Trying regular start...`);
      await sandbox.start();
      startSuccess = true;
      console.log(`[FORCE-START] Regular start command sent`);
    } catch (error) {
      console.log(`[FORCE-START] Regular start failed: ${error}`);
      lastError = error;
    }

    // Approach 2: Try to delete and recreate (if regular start fails)
    if (!startSuccess) {
      try {
        console.log(`[FORCE-START] Trying alternative start methods...`);
        
        // Check if there are any other methods available on the sandbox
        console.log(`[FORCE-START] Available methods on sandbox:`, Object.getOwnPropertyNames(sandbox));
        console.log(`[FORCE-START] Sandbox constructor:`, sandbox.constructor.name);
        
        // Try calling start again with different approach
        if (typeof sandbox.restart === 'function') {
          console.log(`[FORCE-START] Trying restart method...`);
          await sandbox.restart();
          startSuccess = true;
        } else if (typeof sandbox.wake === 'function') {
          console.log(`[FORCE-START] Trying wake method...`);
          await sandbox.wake();
          startSuccess = true;
        } else {
          // Try start again
          await sandbox.start();
          startSuccess = true;
        }
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
        const updatedSandbox = updatedSandboxes.find((s: any) => s.id === sandboxId);

        console.log(`[FORCE-START] Attempt ${attempts + 1}/${maxAttempts}: Status = ${updatedSandbox?.status}`);

        if (updatedSandbox?.status === 'running') {
          // Try to get preview link multiple times
          for (let previewAttempt = 0; previewAttempt < 5; previewAttempt++) {
            try {
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
              const testPreview = await updatedSandbox.getPreviewLink(3000);
              
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
    const preview = await runningSandbox.getPreviewLink(3000);

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
    console.error("[FORCE-START] Error force starting sandbox:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to force start sandbox" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}




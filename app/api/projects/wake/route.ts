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

    console.log(`[API] Waking up sandbox: ${sandboxId}`);

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

    // Log current sandbox state using correct property
    console.log(`[API] Current sandbox state: ${(sandbox as any).state}`);
    console.log(`[API] Sandbox properties:`, {
      id: sandbox.id,
      state: (sandbox as any).state,
      created: sandbox.createdAt,
      target: sandbox.target,
      public: sandbox.public
    });

    // Start the sandbox if it's stopped
    if ((sandbox as any).state === 'stopped' || !(sandbox as any).state) {
      console.log(`[API] Starting sandbox ${sandboxId}...`);
      
      try {
        // Use the SDK's built-in start method with timeout
        console.log(`[API] Calling sandbox.start() with 120 second timeout...`);
        await sandbox.start(120); // 120 second timeout
        console.log(`[API] Sandbox.start() completed successfully!`);
        
        // Refresh sandbox data after starting
        console.log(`[API] Refreshing sandbox data...`);
        await sandbox.refreshData();
        console.log(`[API] Sandbox state after refresh: ${(sandbox as any).state}`);
        
      } catch (startError) {
        console.log(`[API] Sandbox.start() failed:`, startError);
        return new Response(
          JSON.stringify({ 
            error: `Failed to start sandbox: ${startError}`,
            sandboxId: sandboxId,
            currentState: (sandbox as any).state
          }),
          { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
          }
        );
      }
      
      // Additional verification: use waitUntilStarted as backup
      try {
        console.log(`[API] Using waitUntilStarted() as verification...`);
        await sandbox.waitUntilStarted(30); // 30 second additional wait
        console.log(`[API] waitUntilStarted() completed successfully!`);
      } catch (waitError) {
        console.log(`[API] waitUntilStarted() failed: ${waitError}`);
        // Don't fail here, sandbox might still be working
      }
      
      // Final state check
      await sandbox.refreshData();
      console.log(`[API] Final sandbox state: ${(sandbox as any).state}`);
      
      if ((sandbox as any).state !== 'started') {
        console.log(`[API] Warning: Sandbox state is '${(sandbox as any).state}', expected 'started'`);
      }
      
      // Now that sandbox is running, start the development server
      try {
        console.log(`[API] Starting development server in started sandbox ${sandboxId}...`);
        
        // Get the root directory
        const rootDir = await sandbox.getUserRootDir();
        console.log(`[API] Root directory: ${rootDir}`);
        
        // Check what's in the root directory first
        try {
          const dirListing = await sandbox.process.executeCommand(
            `ls -la`,
            rootDir
          );
          console.log(`[API] Root directory contents: ${dirListing.result}`);
        } catch (e) {
          console.log(`[API] Could not list root directory`);
        }

        // Try to run the startup script we created during generation
        try {
          console.log(`[API] Attempting to run startup script: ${rootDir}/startup-dev.sh`);
          
          // First check if script exists
          const scriptCheck = await sandbox.process.executeCommand(
            `test -f startup-dev.sh && echo "exists" || echo "not found"`,
            rootDir
          );
          console.log(`[API] Startup script check: ${scriptCheck.result}`);
          
          if (scriptCheck.result?.trim() === "exists") {
            const startupResult = await sandbox.process.executeCommand(
              `bash ${rootDir}/startup-dev.sh`,
              rootDir
            );
            console.log(`[API] Startup script executed successfully: ${startupResult.result}`);
          } else {
            throw new Error("Startup script not found");
          }
        } catch (startupError) {
          console.log(`[API] Startup script failed, trying manual restart: ${startupError}`);
          
          // Fallback: manually restart the dev server
          const projectDirs = [
            `${rootDir}/website-project`,
            `${rootDir}/project`,
            rootDir
          ];
          
          for (const dir of projectDirs) {
            if (!dir) continue; // Skip if dir is undefined
            
            try {
              console.log(`[API] Trying to restart dev server in ${dir}`);
              
              // Check if directory exists and has package.json
              const dirCheck = await sandbox.process.executeCommand(
                `test -d ${dir.replace(rootDir + '/', '')} && test -f ${dir.replace(rootDir + '/', '')}/package.json && echo "valid" || echo "invalid"`,
                rootDir
              );
              console.log(`[API] Directory check for ${dir}: ${dirCheck.result}`);
              
              if (dirCheck.result?.trim() !== "valid") {
                continue;
              }
              
              // Kill existing processes
              console.log(`[API] Killing existing dev processes in ${dir}`);
              const killResult = await sandbox.process.executeCommand(
                `pkill -f "npm run dev" || true; pkill -f "next dev" || true`,
                dir
              );
              console.log(`[API] Kill result: ${killResult.result}`);
              
              // Start new dev server
              console.log(`[API] Starting new dev server in ${dir}`);
              const devResult = await sandbox.process.executeCommand(
                `nohup npm run dev > dev-server.log 2>&1 &`,
                dir,
                { PORT: "3000" }
              );
              
              console.log(`[API] Dev server start result: ${devResult.result}`);
              console.log(`[API] Dev server restarted successfully in ${dir}`);
              break;
            } catch (dirError) {
              console.log(`[API] Failed to restart in ${dir}: ${dirError}`);
            }
          }
        }
        
        console.log(`[API] Development server restart completed`);

        // Wait for dev server to be ready by monitoring logs
        console.log(`[API] Monitoring dev server startup...`);
        let serverReady = false;
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait

        while (!serverReady && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;

          try {
            // Check dev server logs for ready indicators
            const logCheck = await sandbox.process.executeCommand(
              `cat dev-server.log 2>/dev/null | tail -20`,
              `${rootDir}/website-project`
            );

            const logs = logCheck.result || "";

            // Look for Next.js ready indicators
            if (
              logs.includes("Ready in") ||
              logs.includes("compiled successfully") ||
              logs.includes("Local:") ||
              logs.includes("started server on") ||
              logs.includes("localhost:3000")
            ) {
              serverReady = true;
              console.log(`[API] ✓ Dev server is ready! (${attempts}s)`);
              break;
            }

            // Check for compilation errors
            if (logs.includes("Failed to compile") || logs.includes("error -")) {
              console.log(`[API] ⚠️ Dev server compilation errors detected`);
              break;
            }
          } catch (logError) {
            console.log(`[API] Could not check logs (attempt ${attempts})`);
          }
        }

        if (!serverReady) {
          console.log(`[API] ⚠️ Dev server not ready after ${attempts}s, returning URL anyway`);
        }

        // Get preview URL
        const preview = await sandbox.getPreviewLink(3000);
        console.log(`[API] Preview link result:`, preview);

        // Return preview URL
        return new Response(
          JSON.stringify({
            success: true,
            status: 'started',
            state: (sandbox as any).state,
            isOnline: true,
            previewUrl: preview?.url || null,
            sandboxId: sandboxId,
            serverReady: serverReady,
            message: serverReady ? "Development server ready" : "Development server starting..."
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
        
      } catch (devServerError) {
        console.log(`[API] Failed to restart dev server: ${devServerError}`);
        
        // Still return success since sandbox is running
        const preview = await sandbox.getPreviewLink(3000);
        return new Response(
          JSON.stringify({
            success: true,
            status: 'started',
            state: (sandbox as any).state,
            isOnline: true,
            previewUrl: preview?.url || null,
            sandboxId: sandboxId,
            message: "Sandbox running, dev server needs manual restart"
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    } else {
      console.log(`[API] Sandbox is already in state: ${(sandbox as any).state}`);
    }

    // Fallback: Get preview URL even if sandbox was already started
    console.log(`[API] Getting preview URL for sandbox in state: ${(sandbox as any).state}`);
    const preview = await sandbox.getPreviewLink(3000);
    console.log(`[API] Final preview link result:`, preview);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'started',
        state: (sandbox as any).state,
        isOnline: true,
        previewUrl: preview?.url || null,
        sandboxId: sandboxId,
        message: "Sandbox is ready"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[API] Error waking up sandbox:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to wake up sandbox" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

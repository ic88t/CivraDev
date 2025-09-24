import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sandboxId = searchParams.get('sandboxId');

    if (!sandboxId) {
      return new Response(
        JSON.stringify({ error: "sandboxId parameter is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.DAYTONA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "DAYTONA_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[DEBUG] Getting info for sandbox: ${sandboxId}`);

    // Dynamic import to avoid ESM issues during build
    const { Daytona } = await import('@daytonaio/sdk');
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
    });

    // Get all sandboxes
    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);

    if (!sandbox) {
      return new Response(
        JSON.stringify({ 
          error: "Sandbox not found",
          availableSandboxes: sandboxes.map((s: any) => ({ id: s.id, status: (s as any).status || 'unknown' }))
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get additional info - spread all available properties from sandbox
    let debugInfo: any = {
      ...sandbox
    };

    // Try to get sandbox status through a different method
    let sandboxStatus = 'unknown';
    try {
      // The status might be available through a different property or method
      sandboxStatus = (sandbox as any).status || 'unknown';
    } catch (e) {
      console.log('Could not determine sandbox status:', e);
    }

    debugInfo.status = sandboxStatus;

    // If sandbox is running, try to get more details
    if (sandboxStatus === 'running') {
      try {
        debugInfo.rootDir = await sandbox.getUserRootDir();
        debugInfo.previewLink = await sandbox.getPreviewLink(3000);
        
        // Check if startup script exists
        try {
          const scriptCheck = await sandbox.process.executeCommand(
            `ls -la startup-dev.sh`,
            debugInfo.rootDir
          );
          debugInfo.startupScript = {
            exists: true,
            details: scriptCheck.result
          };
        } catch {
          debugInfo.startupScript = { exists: false };
        }

        // Check if project directory exists
        try {
          const projectCheck = await sandbox.process.executeCommand(
            `ls -la website-project/`,
            debugInfo.rootDir
          );
          debugInfo.projectDir = {
            exists: true,
            contents: projectCheck.result
          };
        } catch {
          debugInfo.projectDir = { exists: false };
        }

        // Check running processes
        try {
          const processCheck = await sandbox.process.executeCommand(
            `ps aux | grep -E "(npm|node|next)" | grep -v grep`,
            debugInfo.rootDir
          );
          debugInfo.runningProcesses = processCheck.result;
        } catch {
          debugInfo.runningProcesses = "No Node.js processes found";
        }

      } catch (error) {
        debugInfo.error = `Failed to get running sandbox details: ${error}`;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        sandbox: debugInfo
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[DEBUG] Error getting sandbox info:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get sandbox info" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}




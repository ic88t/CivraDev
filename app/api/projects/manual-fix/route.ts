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

    const { Daytona } = await import('@daytonaio/sdk');
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY!,
    });

    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);

    if (!sandbox) {
      return new Response(
        JSON.stringify({ error: "Sandbox not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/website-project`;

    console.log('[MANUAL-FIX] Killing existing processes...');
    
    // Kill ALL node processes
    await sandbox.process.executeCommand("pkill -9 node || true", projectDir);
    await sandbox.process.executeCommand("pkill -9 npm || true", projectDir);
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Replace placeholder in providers.tsx using multiple methods
    console.log('[MANUAL-FIX] Fixing providers.tsx...');
    
    await sandbox.process.executeCommand(
      `sed -i "s/YOUR_WALLETCONNECT_PROJECT_ID/21fef48091f12692cad15a1471f0330e/g" app/providers.tsx`,
      projectDir
    );
    
    await sandbox.process.executeCommand(
      `sed -i "s/YOUR_PROJECT_ID/21fef48091f12692cad15a1471f0330e/g" app/providers.tsx`,
      projectDir
    );

    // Verify the fix
    const checkFix = await sandbox.process.executeCommand(
      `grep "projectId" app/providers.tsx`,
      projectDir
    );
    
    console.log('[MANUAL-FIX] Verification:', checkFix.result);

    // Clear Next.js cache
    console.log('[MANUAL-FIX] Clearing Next.js cache...');
    await sandbox.process.executeCommand("rm -rf .next", projectDir);

    // Clean logs
    await sandbox.process.executeCommand("rm -f dev-server.log *.log", projectDir);

    // Start dev server with explicit output
    console.log('[MANUAL-FIX] Starting dev server...');
    
    await sandbox.process.executeCommand(
      `nohup npm run dev > dev-server.log 2>&1 &`,
      projectDir,
      { PORT: "3000", NODE_ENV: "development" }
    );

    // Wait for server to compile
    console.log('[MANUAL-FIX] Waiting for compilation...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Check server status multiple times
    let portStatus = "000";
    for (let i = 0; i < 3; i++) {
      const check = await sandbox.process.executeCommand(
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000",
        projectDir
      );
      portStatus = check.result?.trim() || "000";
      if (portStatus === '200') break;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Get logs
    const logs = await sandbox.process.executeCommand(
      "tail -200 dev-server.log",
      projectDir
    );

    // Get process status
    const ps = await sandbox.process.executeCommand(
      "ps aux | grep node",
      projectDir
    );

    const isRunning = portStatus === '200';

    // Get preview URL if running
    let previewUrl = null;
    if (isRunning) {
      try {
        const preview = await sandbox.getPreviewLink(3000);
        previewUrl = preview?.url;
      } catch (e) {
        console.log('[MANUAL-FIX] Could not get preview URL:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: isRunning,
        previewUrl,
        port3000Status: portStatus,
        fixVerification: checkFix.result?.substring(0, 200),
        processes: ps.result?.substring(0, 500),
        logs: logs.result?.substring(0, 4000) || "(no logs)",
        message: isRunning ? "✅ Fixed and running!" : "Fixed placeholder but still not compiling properly"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[MANUAL-FIX] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}


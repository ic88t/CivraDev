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

    console.log(`[FIX] Fixing project for sandbox: ${sandboxId}`);

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

    // Fix 1: Replace placeholder WalletConnect Project ID with a dummy one
    console.log('[FIX] Replacing placeholder WalletConnect projectId...');
    const fixProvidersResult = await sandbox.process.executeCommand(
      `sed -i "s/YOUR_WALLETCONNECT_PROJECT_ID/21fef48091f12692cad15a1471f03=0e/g" app/providers.tsx`,
      projectDir
    );

    // Fix 2: Kill and restart the dev server
    console.log('[FIX] Restarting dev server...');
    await sandbox.process.executeCommand(
      "pkill -9 -f 'npm run dev' || true",
      projectDir
    );
    await sandbox.process.executeCommand(
      "pkill -9 -f 'next dev' || true",
      projectDir
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear logs
    await sandbox.process.executeCommand(
      "rm -f dev-server.log",
      projectDir
    );

    // Restart server
    await sandbox.process.executeCommand(
      "nohup npm run dev > dev-server.log 2>&1 &",
      projectDir,
      { PORT: "3000" }
    );

    // Wait for server
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check status
    const portCheck = await sandbox.process.executeCommand(
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'FAILED'",
      projectDir
    );

    const isRunning = portCheck.result?.trim() === '200';

    // Get preview URL if running
    let previewUrl = null;
    if (isRunning) {
      try {
        const preview = await sandbox.getPreviewLink(3000);
        previewUrl = preview?.url;
      } catch (e) {
        console.log('[FIX] Could not get preview URL:', e);
      }
    }

    // Get logs
    const logsResult = await sandbox.process.executeCommand(
      "tail -100 dev-server.log",
      projectDir
    );

    return new Response(
      JSON.stringify({
        success: isRunning,
        previewUrl,
        port3000Status: portCheck.result?.trim(),
        logs: logsResult.result?.substring(0, 3000) || "(no logs)",
        message: isRunning ? "Project fixed and running!" : "Fixed placeholder but server still not responding"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[FIX] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fix project" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}


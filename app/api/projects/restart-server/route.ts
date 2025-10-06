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

    console.log(`[RESTART] Restarting dev server for sandbox: ${sandboxId}`);

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

    // Kill existing processes
    console.log('[RESTART] Killing existing dev server processes...');
    await sandbox.process.executeCommand(
      "pkill -9 -f 'npm run dev' || true",
      projectDir
    );
    await sandbox.process.executeCommand(
      "pkill -9 -f 'next dev' || true",
      projectDir
    );
    await sandbox.process.executeCommand(
      "pkill -9 -f 'node' || true",
      projectDir
    );

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear old logs
    await sandbox.process.executeCommand(
      "rm -f dev-server.log",
      projectDir
    );

    console.log('[RESTART] Starting dev server...');
    
    // Start server and capture output
    await sandbox.process.executeCommand(
      "nohup npm run dev > dev-server.log 2>&1 &",
      projectDir,
      { PORT: "3000" }
    );

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get the logs
    const logsResult = await sandbox.process.executeCommand(
      "cat dev-server.log",
      projectDir
    );

    // Check if server is responding
    const portCheck = await sandbox.process.executeCommand(
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'FAILED'",
      projectDir
    );

    const isRunning = portCheck.result?.trim() === '200';

    return new Response(
      JSON.stringify({
        success: isRunning,
        port3000Status: portCheck.result?.trim(),
        logs: logsResult.result || "(no logs)",
        message: isRunning ? "Server restarted successfully" : "Server started but not responding on port 3000"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[RESTART] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to restart server" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}


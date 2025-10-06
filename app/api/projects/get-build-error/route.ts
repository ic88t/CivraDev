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

    // Kill existing server
    await sandbox.process.executeCommand("pkill -9 -f 'npm' || true", projectDir);
    await sandbox.process.executeCommand("pkill -9 -f 'next' || true", projectDir);
    await sandbox.process.executeCommand("pkill -9 -f 'node' || true", projectDir);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to build (this will show errors more clearly than dev)
    const buildResult = await sandbox.process.executeCommand(
      "npm run build 2>&1",
      projectDir,
      undefined,
      120000 // 2 minute timeout
    );

    return new Response(
      JSON.stringify({
        exitCode: buildResult.exitCode,
        output: buildResult.result || "(no output)",
        success: buildResult.exitCode === 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}


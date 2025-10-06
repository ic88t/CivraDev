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

    // List all files
    const lsResult = await sandbox.process.executeCommand(
      "find . -type f -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' -o -name 'package.json' | head -50",
      projectDir
    );

    // Get package.json
    const packageJson = await sandbox.process.executeCommand(
      "cat package.json 2>/dev/null || echo 'NOT FOUND'",
      projectDir
    );

    // Check for common error files
    const appLayout = await sandbox.process.executeCommand(
      "cat app/layout.tsx 2>/dev/null | head -100 || echo 'NOT FOUND'",
      projectDir
    );

    const appPage = await sandbox.process.executeCommand(
      "cat app/page.tsx 2>/dev/null | head -100 || echo 'NOT FOUND'",
      projectDir
    );

    const providers = await sandbox.process.executeCommand(
      "cat app/providers.tsx 2>/dev/null | head -100 || echo 'NOT FOUND'",
      projectDir
    );

    return new Response(
      JSON.stringify({
        files: lsResult.result?.split('\n').filter(f => f.trim()) || [],
        packageJson: packageJson.result || "NOT FOUND",
        appLayout: appLayout.result || "NOT FOUND",
        appPage: appPage.result || "NOT FOUND",
        providers: providers.result || "NOT FOUND"
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


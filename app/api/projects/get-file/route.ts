import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sandboxId = searchParams.get('id');
    const filePath = searchParams.get('file') || 'components/Navigation.tsx';

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

    const fileContent = await sandbox.process.executeCommand(
      `cat ${filePath} 2>/dev/null || echo 'FILE_NOT_FOUND'`,
      projectDir
    );

    return new Response(
      JSON.stringify({
        filePath,
        exists: !fileContent.result?.includes('FILE_NOT_FOUND'),
        content: fileContent.result || "FILE_NOT_FOUND"
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


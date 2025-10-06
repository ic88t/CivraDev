import { NextRequest } from "next/server";
import { getCurrentUserFromRequest, getCurrentUser } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sandboxId = searchParams.get("sandboxId");
    const filePath = searchParams.get("filePath");

    if (!sandboxId) {
      return new Response(
        JSON.stringify({ error: "sandboxId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get authenticated user
    let user = await getCurrentUserFromRequest(req);
    if (!user) {
      user = await getCurrentUser();
    }

    if (!user?.email) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.DAYTONA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Daytona API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Dynamic import to avoid ESM issues
    const { Daytona } = await import("@daytonaio/sdk");

    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
    });

    // Get sandbox
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

    // If filePath is provided, return file content
    if (filePath) {
      const fileContent = await sandbox.process.executeCommand(
        `cat "${filePath}"`,
        projectDir
      );

      if (fileContent.exitCode !== 0) {
        return new Response(
          JSON.stringify({ error: "File not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          content: fileContent.result || "",
          path: filePath
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Otherwise, return file tree
    const fileTree = await sandbox.process.executeCommand(
      `find . -type f -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" | sort`,
      projectDir
    );

    if (fileTree.exitCode !== 0) {
      return new Response(
        JSON.stringify({ error: "Failed to list files" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const files = (fileTree.result || "")
      .split("\n")
      .filter((f) => f.trim())
      .map((f) => f.replace("./", ""));

    return new Response(
      JSON.stringify({ files }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[FILES API] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

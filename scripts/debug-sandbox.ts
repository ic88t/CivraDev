import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function debugSandbox(sandboxIdArg?: string) {
  if (!process.env.DAYTONA_API_KEY) {
    console.error("ERROR: DAYTONA_API_KEY not set");
    process.exit(1);
  }

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  try {
    // List all sandboxes
    console.log("🔍 Fetching all Daytona sandboxes...\n");
    let sandboxes = await daytona.list();

    // Filter to specific sandbox if provided
    if (sandboxIdArg) {
      sandboxes = sandboxes.filter((s: any) => s.id === sandboxIdArg);
      if (sandboxes.length === 0) {
        console.error(`❌ Sandbox ${sandboxIdArg} not found`);
        process.exit(1);
      }
    }

    console.log(`Found ${sandboxes.length} sandbox(es):\n`);

    for (const sandbox of sandboxes) {
      console.log(`📦 Sandbox: ${sandbox.id}`);
      console.log(`   Status: ${sandbox.status || 'unknown'}`);

      try {
        const rootDir = await sandbox.getUserRootDir();
        console.log(`   Root Dir: ${rootDir}`);

        // Check if website-project exists
        const projectCheck = await sandbox.process.executeCommand(
          `test -d website-project && echo "exists" || echo "not found"`,
          rootDir
        );
        console.log(`   Project exists: ${projectCheck.result?.trim()}`);

        if (projectCheck.result?.trim() === "exists") {
          const projectDir = `${rootDir}/website-project`;

          // List files in project
          const filesResult = await sandbox.process.executeCommand(
            "ls -la",
            projectDir
          );
          console.log(`   Files in project:\n${filesResult.result}`);

          // Check package.json
          const pkgCheck = await sandbox.process.executeCommand(
            "test -f package.json && cat package.json || echo 'No package.json'",
            projectDir
          );
          console.log(`   Package.json:\n${pkgCheck.result?.substring(0, 500)}`);

          // Check if dev server is running
          const serverCheck = await sandbox.process.executeCommand(
            "ps aux | grep 'next dev' | grep -v grep || echo 'No dev server'",
            projectDir
          );
          console.log(`   Dev server: ${serverCheck.result?.trim() || 'Not running'}`);

          // Check dev server logs if they exist
          const logsCheck = await sandbox.process.executeCommand(
            "test -f dev-server.log && tail -20 dev-server.log || echo 'No logs'",
            projectDir
          );
          console.log(`   Server logs:\n${logsCheck.result}`);

          // Try to get preview URL
          try {
            const preview = await sandbox.getPreviewLink(3000);
            console.log(`   Preview URL: ${preview.url}`);
          } catch (e) {
            console.log(`   Preview URL: Failed to get - ${e}`);
          }
        }
      } catch (err) {
        console.log(`   Error checking sandbox: ${err}`);
      }

      console.log("\n" + "=".repeat(60) + "\n");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Get sandbox ID from command line args
const sandboxId = process.argv[2];
debugSandbox(sandboxId);

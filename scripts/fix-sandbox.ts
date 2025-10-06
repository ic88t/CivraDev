import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function fixSandbox(sandboxId: string) {
  if (!process.env.DAYTONA_API_KEY) {
    console.error("ERROR: DAYTONA_API_KEY not set");
    process.exit(1);
  }

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  try {
    console.log(`🔧 Fixing sandbox: ${sandboxId}\n`);

    const sandboxes = await daytona.list();
    const sandbox = sandboxes.find((s: any) => s.id === sandboxId);

    if (!sandbox) {
      console.error(`❌ Sandbox ${sandboxId} not found`);
      process.exit(1);
    }

    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/website-project`;

    // Step 1: Install dependencies
    console.log("1. Installing dependencies (this may take a while)...");
    const npmInstall = await sandbox.process.executeCommand(
      "npm install --verbose",
      projectDir,
      undefined,
      600000 // 10 min timeout
    );

    console.log("npm install output:");
    console.log(npmInstall.result);
    console.log(`Exit code: ${npmInstall.exitCode}\n`);

    if (npmInstall.exitCode !== 0) {
      console.error("❌ npm install failed!");
      process.exit(1);
    }

    // Step 2: Kill any existing dev servers
    console.log("2. Stopping any existing dev servers...");
    await sandbox.process.executeCommand(
      `pkill -f "npm run dev" || true && pkill -f "next dev" || true`,
      projectDir
    );

    // Step 3: Start dev server
    console.log("3. Starting dev server...");
    await sandbox.process.executeCommand(
      `nohup npm run dev > dev-server.log 2>&1 &`,
      projectDir,
      { PORT: "3000" }
    );

    console.log("4. Waiting for server to start...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Step 5: Check if server is running
    const serverCheck = await sandbox.process.executeCommand(
      "ps aux | grep 'next dev' | grep -v grep",
      projectDir
    );

    console.log("\nServer process:");
    console.log(serverCheck.result || "Not running");

    // Step 6: Check server logs
    const logs = await sandbox.process.executeCommand(
      "tail -30 dev-server.log",
      projectDir
    );

    console.log("\nServer logs:");
    console.log(logs.result);

    // Step 7: Get preview URL
    console.log("\n5. Getting preview URL...");
    const preview = await sandbox.getPreviewLink(3000);
    console.log(`\n✅ Preview URL: ${preview.url}`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

const sandboxId = process.argv[2];

if (!sandboxId) {
  console.error("Usage: npx tsx scripts/fix-sandbox.ts <sandbox-id>");
  process.exit(1);
}

fixSandbox(sandboxId);

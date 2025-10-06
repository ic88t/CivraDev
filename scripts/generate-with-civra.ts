import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../../.env") });

// Load comprehensive Civra agent prompt
const CIVRA_PROMPT = fs.readFileSync(
  path.join(__dirname, "../lib/civra-agent-prompt.md"),
  "utf-8"
);

interface FileOperation {
  type: "write" | "delete" | "rename" | "add-dependency";
  filePath?: string;
  content?: string;
  originalPath?: string;
  newPath?: string;
  package?: string;
}

/**
 * Parse Civra-style response with <dec-code>, <dec-write>, etc.
 */
function parseCivraResponse(responseText: string): FileOperation[] {
  const operations: FileOperation[] = [];

  // Extract <dec-code> block
  const decCodeMatch = responseText.match(/<dec-code>([\s\S]*?)<\/dec-code>/);
  if (!decCodeMatch) {
    console.log("No <dec-code> block found in response");
    return operations;
  }

  const codeBlock = decCodeMatch[1];

  // Parse <dec-write> tags
  const writeRegex = /<dec-write\s+file_path="([^"]+)">([\s\S]*?)<\/dec-write>/g;
  let match;
  while ((match = writeRegex.exec(codeBlock)) !== null) {
    operations.push({
      type: "write",
      filePath: match[1],
      content: match[2].trim(),
    });
  }

  // Parse <dec-delete> tags
  const deleteRegex = /<dec-delete\s+file_path="([^"]+)"\s*\/>/g;
  while ((match = deleteRegex.exec(codeBlock)) !== null) {
    operations.push({
      type: "delete",
      filePath: match[1],
    });
  }

  // Parse <dec-rename> tags
  const renameRegex =
    /<dec-rename\s+original_file_path="([^"]+)"\s+new_file_path="([^"]+)"\s*\/>/g;
  while ((match = renameRegex.exec(codeBlock)) !== null) {
    operations.push({
      type: "rename",
      originalPath: match[1],
      newPath: match[2],
    });
  }

  // Parse <dec-add-dependency> tags
  const depRegex = /<dec-add-dependency>(.*?)<\/dec-add-dependency>/g;
  while ((match = depRegex.exec(codeBlock)) !== null) {
    operations.push({
      type: "add-dependency",
      package: match[1].trim(),
    });
  }

  return operations;
}

/**
 * Call Anthropic API directly
 */
async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const https = await import("https");

  const apiRequestData = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.anthropic.com",
      port: 443,
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(apiRequestData),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error("API Error: " + JSON.stringify(response.error)));
          } else {
            resolve(response.content[0].text);
          }
        } catch (e) {
          reject(new Error("Invalid JSON response"));
        }
      });
    });

    req.on("error", reject);
    req.write(apiRequestData);
    req.end();
  });
}

async function generateWithCivra(
  sandboxIdArg?: string,
  prompt?: string
) {
  console.log("🚀 Starting Civra-based website generation...\n");

  if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: DAYTONA_API_KEY and ANTHROPIC_API_KEY must be set");
    process.exit(1);
  }

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
  });

  let sandbox;
  let sandboxId = sandboxIdArg;

  try {
    // Step 1: Create or get sandbox
    if (sandboxId) {
      console.log(`1. Using existing sandbox: ${sandboxId}`);
      const sandboxes = await daytona.list();
      sandbox = sandboxes.find((s: any) => s.id === sandboxId);
      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found`);
      }
      console.log(`✓ Connected to sandbox: ${sandbox.id}`);
    } else {
      console.log("1. Creating new Daytona sandbox...");
      sandbox = await daytona.create({
        public: true,
        image: "node:20",
      });
      sandboxId = sandbox.id;
      console.log(`✓ Sandbox created: ${sandboxId}`);
    }

    // Get the root directory
    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/website-project`;

    // Step 2: Setup or check project directory
    console.log("\n2. Setting up project...");
    const projectExists = await sandbox.process.executeCommand(
      `test -d website-project && echo "exists" || echo "not found"`,
      rootDir
    );

    const isExistingProject = projectExists.result?.trim() === "exists";

    if (!isExistingProject) {
      await sandbox.process.executeCommand(`mkdir -p ${projectDir}`, rootDir);
      console.log(`✓ Created project directory: ${projectDir}`);
    } else {
      console.log(`✓ Using existing project: ${projectDir}`);
    }

    // Step 3: Build context from existing files
    console.log("\n3. Reading project context...");
    let codeContext = "## Allowed files\nYou are allowed to modify the following files:\n\n";

    const allowedFiles = [
      "package.json",
      "tsconfig.json",
      "next.config.ts",
      "next.config.js",
      "app/page.tsx",
      "app/page.js",
      "app/layout.tsx",
      "app/layout.js",
      "src/layout.tsx",
      "src/globals.css",
      "app/globals.css",
    ];

    for (const file of allowedFiles) {
      const fileContent = await sandbox.process.executeCommand(
        `cat ${file} 2>/dev/null || echo ""`,
        projectDir
      );

      if (fileContent.result && fileContent.result.trim().length > 0) {
        codeContext += `${file}\n\`\`\`\n${fileContent.result}\n\`\`\`\n\n`;
        console.log(`  Found: ${file}`);
      }
    }

    // Build system prompt with context
    const systemPrompt = isExistingProject
      ? CIVRA_PROMPT.replace(
          "## First Message Instructions",
          `## Current Project Context\n\n${codeContext}\n\n## First Message Instructions`
        )
      : CIVRA_PROMPT;

    // Step 4: Generate with Claude using Civra prompt
    console.log(`\n4. Generating with Civra prompt...`);
    console.log(`Prompt: "${prompt}"\n`);

    const userPrompt = isExistingProject
      ? `${prompt}\n\nNote: This is an existing project. Please analyze the current files and make appropriate modifications.`
      : prompt || "Create a modern Next.js website with TypeScript and Tailwind CSS";

    const response = await callClaude(systemPrompt, userPrompt);

    console.log("\n[Claude Response - Full]:");
    console.log(response);
    console.log("\n[Claude Response - End]\n");
    console.log("__CLAUDE_MESSAGE__", JSON.stringify({ type: "assistant", content: response }));

    // Step 5: Parse and execute operations
    const operations = parseCivraResponse(response);
    console.log(`\n5. Executing ${operations.length} file operations...\n`);

    for (const op of operations) {
      try {
        if (op.type === "write" && op.filePath && op.content !== undefined) {
          // Ensure directory exists
          const dir = path.dirname(op.filePath);
          if (dir !== ".") {
            await sandbox.process.executeCommand(`mkdir -p ${dir}`, projectDir);
          }

          // Write file using heredoc (no escaping needed with 'FILE_EOF')
          await sandbox.process.executeCommand(
            `cat > ${op.filePath} << 'FILE_EOF'\n${op.content}\nFILE_EOF`,
            projectDir
          );

          console.log(`  ✓ Wrote: ${op.filePath}`);
          console.log("__TOOL_USE__", JSON.stringify({
            type: "tool_use",
            name: "write",
            input: { file_path: op.filePath }
          }));
        } else if (op.type === "delete" && op.filePath) {
          await sandbox.process.executeCommand(`rm -f ${op.filePath}`, projectDir);
          console.log(`  ✓ Deleted: ${op.filePath}`);
          console.log("__TOOL_USE__", JSON.stringify({
            type: "tool_use",
            name: "delete",
            input: { file_path: op.filePath }
          }));
        } else if (op.type === "rename" && op.originalPath && op.newPath) {
          await sandbox.process.executeCommand(
            `mv ${op.originalPath} ${op.newPath}`,
            projectDir
          );
          console.log(`  ✓ Renamed: ${op.originalPath} -> ${op.newPath}`);
          console.log("__TOOL_USE__", JSON.stringify({
            type: "tool_use",
            name: "rename",
            input: { original_path: op.originalPath, new_path: op.newPath }
          }));
        } else if (op.type === "add-dependency" && op.package) {
          console.log(`  Installing: ${op.package}...`);
          await sandbox.process.executeCommand(
            `npm install ${op.package}`,
            projectDir,
            undefined,
            180000 // 3 min timeout
          );
          console.log(`  ✓ Installed: ${op.package}`);
          console.log("__TOOL_USE__", JSON.stringify({
            type: "tool_use",
            name: "add-dependency",
            input: { package: op.package }
          }));
        }
      } catch (opError) {
        console.error(`  ✗ Failed to execute operation:`, opError);
      }
    }

    // Step 6: Install dependencies if package.json exists
    console.log("\n6. Installing dependencies...");
    const hasPackageJson = await sandbox.process.executeCommand(
      `test -f package.json && echo "yes" || echo "no"`,
      projectDir
    );

    if (hasPackageJson.result?.trim() === "yes") {
      console.log("Running npm install...");
      const npmInstall = await sandbox.process.executeCommand(
        "npm install --legacy-peer-deps",
        projectDir,
        undefined,
        300000 // 5 min timeout
      );

      if (npmInstall.exitCode === 0) {
        console.log("✓ Dependencies installed");
      } else {
        console.log("⚠️  npm install had issues:");
        console.log(npmInstall.result?.substring(0, 500));
        throw new Error("npm install failed. Check the logs above.");
      }
    }

    // Step 7: Start dev server
    console.log("\n7. Starting development server...");

    // Kill any existing servers
    await sandbox.process.executeCommand(
      `pkill -f "npm run dev" || true && pkill -f "next dev" || true`,
      projectDir
    );

    // Start in background
    await sandbox.process.executeCommand(
      `nohup npm run dev > dev-server.log 2>&1 &`,
      projectDir,
      { PORT: "3000" }
    );

    console.log("✓ Server started in background");

    // Wait for server
    console.log("Waiting for server to start...");
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Step 8: Get preview URL
    console.log("\n8. Getting preview URL...");
    const preview = await sandbox.getPreviewLink(3000);

    console.log("\n✨ SUCCESS! Website generated with Civra!");
    console.log("\n📊 SUMMARY:");
    console.log("===========");
    console.log(`Sandbox ID: ${sandboxId}`);
    console.log(`Preview URL: ${preview.url}`);

    console.log("\n🌐 VISIT YOUR WEBSITE:");
    console.log(preview.url);

    return {
      success: true,
      sandboxId: sandboxId,
      previewUrl: preview.url,
    };
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let sandboxId: string | undefined;
  let prompt: string | undefined;

  // Parse arguments
  if (args.length > 0) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(args[0])) {
      sandboxId = args[0];
      prompt = args.slice(1).join(" ");
    } else {
      prompt = args.join(" ");
    }
  }

  if (!prompt) {
    prompt = "Create a modern Next.js website with a clean design";
  }

  console.log("📝 Configuration:");
  console.log(`- Sandbox: ${sandboxId ? `Using ${sandboxId}` : "Creating new"}`);
  console.log(`- Prompt: ${prompt}`);
  console.log();

  try {
    await generateWithCivra(sandboxId, prompt);
  } catch (error) {
    console.error("Failed to generate:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  console.log("\n\n👋 Exiting...");
  process.exit(0);
});

main();

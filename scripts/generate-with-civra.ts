import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { chatLog, debugLog, sendClaudeMessage } from "./chat-logger";

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
    console.error("No <dec-code> block found in response");
    console.error("Response preview:", responseText.substring(0, 500));
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
  debugLog("🚀 Starting Civra-based website generation...\n");

  if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    debugLog("ERROR: DAYTONA_API_KEY and ANTHROPIC_API_KEY must be set");
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
      debugLog(`1. Using existing sandbox: ${sandboxId}`);
      chatLog("🔄 Connecting to your project...");
      const sandboxes = await daytona.list();
      sandbox = sandboxes.find((s: any) => s.id === sandboxId);
      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found`);
      }
      debugLog(`✓ Connected to sandbox: ${sandbox.id}`);
    } else {
      debugLog("1. Creating new Daytona sandbox...");
      chatLog("⚙️ Setting up your development environment...");

      // Try to use pre-configured image, fallback to node:20 if not available
      let imageToUse = "iceonice/civra-nextjs:latest";
      try {
        sandbox = await daytona.create({
          public: true,
          image: imageToUse,
        });
        debugLog(`✓ Using pre-configured image: ${imageToUse}`);
      } catch (imageError) {
        debugLog(`Pre-configured image not found, using fallback node:20...`);
        imageToUse = "node:20";
        sandbox = await daytona.create({
          public: true,
          image: imageToUse,
        });
        debugLog(`✓ Using fallback image: ${imageToUse}`);

        // Install pnpm on fallback image
        debugLog("Installing pnpm globally for speed...");
        await sandbox.process.executeCommand("npm install -g pnpm", "/root");
      }

      sandboxId = sandbox.id;
      debugLog(`✓ Sandbox created: ${sandboxId}`);
    }

    // Get the root directory
    const rootDir = await sandbox.getUserRootDir();
    const projectDir = `${rootDir}/website-project`;

    // Step 2: Setup or check project directory
    debugLog("\n2. Setting up project...");
    const projectExists = await sandbox.process.executeCommand(
      `test -d website-project && echo "exists" || echo "not found"`,
      rootDir
    );

    const isExistingProject = projectExists.result?.trim() === "exists";

    if (!isExistingProject) {
      await sandbox.process.executeCommand(`mkdir -p ${projectDir}`, rootDir);
      debugLog(`✓ Created project directory: ${projectDir}`);
    } else {
      debugLog(`✓ Using existing project: ${projectDir}`);
    }

    // Step 3: Build context from existing files (only for existing projects)
    let systemPrompt = CIVRA_PROMPT;

    if (isExistingProject) {
      debugLog("\n3. Reading project context...");
      let codeContext = "## Current Project Files\n\nHere are the existing files in this project:\n\n";

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
          debugLog(`  Found: ${file}`);
        }
      }

      // Build system prompt with context for existing projects
      systemPrompt = CIVRA_PROMPT.replace(
        "## First Message Instructions",
        `## Current Project Context\n\n${codeContext}\n\n## First Message Instructions`
      );
    } else {
      debugLog("\n3. New project - no context needed");
    }

    // Step 4: Generate with Claude using Civra prompt
    debugLog(`\n4. Generating with Civra prompt...`);
    debugLog(`Prompt: "${prompt}"\n`);

    const userPrompt = isExistingProject
      ? `${prompt}\n\nNote: This is an existing project. Please analyze the current files and make appropriate modifications.`
      : prompt || "Create a modern Next.js website with TypeScript and Tailwind CSS";

    const response = await callClaude(systemPrompt, userPrompt);

    // Extract clean chat messages (text outside <dec-code> blocks)
    // Split response into parts before, during, and after <dec-code>
    const beforeCodeMatch = response.match(/^([\s\S]*?)<dec-code>/);
    const afterCodeMatch = response.match(/<\/dec-code>([\s\S]*)$/);

    const introMessage = beforeCodeMatch && beforeCodeMatch[1].trim();
    const completionMessage = afterCodeMatch && afterCodeMatch[1].trim();

    // Send intro message first
    if (introMessage) {
      sendClaudeMessage(introMessage);
    }

    // Step 5: Parse and execute operations (OPTIMIZED: Parallel execution)
    const operations = parseCivraResponse(response);
    debugLog(`\n5. Executing ${operations.length} file operations...\n`);

    if (operations.length === 0) {
      debugLog("WARNING: No operations found! Check if Claude response contains <dec-code> block");
      debugLog("Response length:", response.length);
    } else {
      chatLog("🔧 Generating project files...");
    }

    // Group operations by type for parallel execution
    const writeOps = operations.filter(op => op.type === "write");
    const deleteOps = operations.filter(op => op.type === "delete");
    const renameOps = operations.filter(op => op.type === "rename");
    const depOps = operations.filter(op => op.type === "add-dependency");

    // Execute write operations in parallel (biggest speedup)
    if (writeOps.length > 0) {
      debugLog(`Writing ${writeOps.length} files in parallel...`);
      await Promise.all(writeOps.map(async (op) => {
        try {
          if (op.filePath && op.content !== undefined) {
            // Check if file already exists with same content (skip unchanged)
            const existingContent = await sandbox.process.executeCommand(
              `cat ${op.filePath} 2>/dev/null || echo ""`,
              projectDir
            );

            if (existingContent.result?.trim() === op.content.trim()) {
              debugLog(`  ⏭️  Skipped: ${op.filePath} (unchanged)`);
              return;
            }

            // Ensure directory exists
            const dir = path.dirname(op.filePath);
            if (dir !== ".") {
              await sandbox.process.executeCommand(`mkdir -p ${dir}`, projectDir);
            }

            // Write file using heredoc
            await sandbox.process.executeCommand(
              `cat > ${op.filePath} << 'FILE_EOF'\n${op.content}\nFILE_EOF`,
              projectDir
            );

            debugLog(`  ✓ Wrote: ${op.filePath}`);
          }
        } catch (opError) {
          debugLog(`  ✗ Failed to write ${op.filePath}:`, opError);
        }
      }));
    }

    // Execute delete operations in parallel
    if (deleteOps.length > 0) {
      await Promise.all(deleteOps.map(async (op) => {
        try {
          if (op.filePath) {
            await sandbox.process.executeCommand(`rm -f ${op.filePath}`, projectDir);
            debugLog(`  ✓ Deleted: ${op.filePath}`);
          }
        } catch (opError) {
          debugLog(`  ✗ Failed to delete ${op.filePath}:`, opError);
        }
      }));
    }

    // Execute rename operations sequentially (order may matter)
    for (const op of renameOps) {
      try {
        if (op.originalPath && op.newPath) {
          await sandbox.process.executeCommand(
            `mv ${op.originalPath} ${op.newPath}`,
            projectDir
          );
          debugLog(`  ✓ Renamed: ${op.originalPath} -> ${op.newPath}`);
        }
      } catch (opError) {
        debugLog(`  ✗ Failed to rename:`, opError);
      }
    }

    // Execute dependency installations sequentially (npm install can conflict)
    for (const op of depOps) {
      try {
        if (op.package) {
          debugLog(`  Installing: ${op.package}...`);
          await sandbox.process.executeCommand(
            `pnpm add ${op.package}`,  // Use pnpm for speed
            projectDir,
            undefined,
            180000 // 3 min timeout
          );
          debugLog(`  ✓ Installed: ${op.package}`);
        }
      } catch (opError) {
        debugLog(`  ✗ Failed to install dependency:`, opError);
      }
    }

    // Step 6: Install dependencies if package.json exists (OPTIMIZED: Use pnpm)
    debugLog("\n6. Installing dependencies...");
    chatLog("📦 Installing dependencies...");
    const hasPackageJson = await sandbox.process.executeCommand(
      `test -f package.json && echo "yes" || echo "no"`,
      projectDir
    );

    if (hasPackageJson.result?.trim() === "yes") {
      // Check if this is a new project or if new deps were added
      const hasNodeModules = await sandbox.process.executeCommand(
        `test -d node_modules && echo "yes" || echo "no"`,
        projectDir
      );

      if (hasNodeModules.result?.trim() === "yes") {
        debugLog("Using pnpm install for speed (with cache)...");
        const pnpmInstall = await sandbox.process.executeCommand(
          "pnpm install --prefer-offline --no-frozen-lockfile",
          projectDir,
          undefined,
          180000 // 3 min timeout (pnpm is faster)
        );

        if (pnpmInstall.exitCode === 0) {
          debugLog("✓ Dependencies installed (pnpm with cache)");
        } else {
          debugLog("⚠️  pnpm install had issues, falling back to npm:");
          debugLog(pnpmInstall.result?.substring(0, 500));
          // Fallback to npm
          await sandbox.process.executeCommand(
            "npm install --legacy-peer-deps",
            projectDir,
            undefined,
            300000
          );
          debugLog("✓ Dependencies installed (npm fallback)");
        }
      } else {
        // New project - deps may already be in base image, just link them
        debugLog("Linking pre-installed dependencies from base image...");
        await sandbox.process.executeCommand(
          "pnpm install --prefer-offline || npm install --legacy-peer-deps",
          projectDir,
          undefined,
          180000
        );
        debugLog("✓ Dependencies ready");
      }
    }

    // Step 7: Start dev server
    debugLog("\n7. Starting development server...");
    chatLog("▶️ Starting development server...");

    // Kill any existing servers
    await sandbox.process.executeCommand(
      `pkill -f "npm run dev" || true && pkill -f "next dev" || true`,
      projectDir
    );

    // Wait a moment for ports to be released
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Start in background with better logging
    debugLog("Starting Next.js dev server on port 3000...");
    const startServer = await sandbox.process.executeCommand(
      `nohup npm run dev > dev-server.log 2>&1 &`,
      projectDir,
      { PORT: "3000" }
    );

    debugLog("✓ Server start command sent");

    // Wait for server to be ready and check logs
    debugLog("Waiting for server to start...");
    let serverReady = false;
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds max

    while (!serverReady && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      // Check if server is running
      const logCheck = await sandbox.process.executeCommand(
        `cat dev-server.log 2>/dev/null | tail -20`,
        projectDir
      );

      const logs = logCheck.result || "";
      debugLog(`Server logs (attempt ${attempts}):`, logs.substring(0, 200));

      // Look for success indicators
      if (logs.includes("Ready in") ||
          logs.includes("started server") ||
          logs.includes("Local:") ||
          logs.includes("localhost:3000")) {
        serverReady = true;
        debugLog("✓ Server is ready!");
        break;
      }

      // Check for errors
      if (logs.includes("Error:") || logs.includes("Failed to compile")) {
        debugLog("⚠️  Server encountered an error:");
        debugLog(logs);
        throw new Error("Dev server failed to start. Check logs above.");
      }
    }

    if (!serverReady) {
      debugLog("⚠️  Server may not be ready yet, but continuing...");
      const finalLogs = await sandbox.process.executeCommand(
        `cat dev-server.log 2>/dev/null`,
        projectDir
      );
      debugLog("Final server logs:", finalLogs.result?.substring(0, 500));
    }

    // Step 8: Get preview URL
    debugLog("\n8. Getting preview URL...");
    const preview = await sandbox.getPreviewLink(3000);

    debugLog("\n✨ SUCCESS! Website generated with Civra!");
    debugLog("\n📊 SUMMARY:");
    debugLog("===========");
    debugLog(`Sandbox ID: ${sandboxId}`);
    debugLog(`Preview URL: ${preview.url}`);

    // Send completion message to user
    if (completionMessage) {
      sendClaudeMessage(completionMessage);
    }

    // Output structured data for API to capture (stdout)
    console.log(`Sandbox ID: ${sandboxId}`);
    console.log(`Preview URL: ${preview.url}`);

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

  debugLog("📝 Configuration:");
  debugLog(`- Sandbox: ${sandboxId ? `Using ${sandboxId}` : "Creating new"}`);
  debugLog(`- Prompt: ${prompt}`);
  debugLog("");

  try {
    await generateWithCivra(sandboxId, prompt);
  } catch (error) {
    debugLog("Failed to generate:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  debugLog("\n\n👋 Exiting...");
  process.exit(0);
});

main();

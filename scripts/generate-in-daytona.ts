import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, "../../../.env") });

async function generateWebsiteInDaytona(
  sandboxIdArg?: string,
  prompt?: string
) {
  console.log("🚀 Starting website generation in Daytona sandbox...\n");

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
      // Get existing sandbox
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
    console.log(`✓ Working directory: ${rootDir}`);

    // Step 2: Setup project directory (check if existing)
    console.log("\n2. Setting up project directory...");
    const projectDir = `${rootDir}/website-project`;
    
    // Check if project already exists
    const projectExists = await sandbox.process.executeCommand(
      `test -d website-project && echo "exists" || echo "not found"`,
      rootDir
    );
    
    const isExistingProject = projectExists.result?.trim() === "exists";
    
    if (isExistingProject) {
      console.log(`✓ Using existing project directory: ${projectDir}`);
      
      // Check if it has package.json
      const hasPackageJson = await sandbox.process.executeCommand(
        `test -f package.json && echo "exists" || echo "not found"`,
        projectDir
      );
      
      if (hasPackageJson.result?.trim() === "exists") {
        console.log("✓ Found existing package.json");
      } else {
        console.log("⚠️  No package.json found, will create one");
        await sandbox.process.executeCommand("npm init -y", projectDir);
        console.log("✓ Package.json created");
      }
    } else {
      console.log("Creating new project directory...");
      await sandbox.process.executeCommand(`mkdir -p ${projectDir}`, rootDir);
      console.log(`✓ Created project directory: ${projectDir}`);
      
      // Step 3: Initialize npm project for new projects
      console.log("\n3. Initializing npm project...");
      await sandbox.process.executeCommand("npm init -y", projectDir);
      console.log("✓ Package.json created");
    }

    // Step 4: Install/Update Claude Code SDK
    console.log(`\n${isExistingProject ? '3' : '4'}. Installing/Updating Claude Code SDK...`);
    const installResult = await sandbox.process.executeCommand(
      "npm install @anthropic-ai/claude-code@latest",
      projectDir,
      undefined,
      180000 // 3 minute timeout
    );

    if (installResult.exitCode !== 0) {
      console.error("Installation failed:", installResult.result);
      throw new Error("Failed to install Claude Code SDK");
    }
    console.log("✓ Claude Code SDK installed/updated");

    // Verify installation
    console.log(`\n${isExistingProject ? '4' : '5'}. Verifying installation...`);
    const checkInstall = await sandbox.process.executeCommand(
      "ls -la node_modules/@anthropic-ai/claude-code",
      projectDir
    );
    console.log("Installation check:", checkInstall.result);

    // Step 5/6: Create the generation script file
    console.log(`\n${isExistingProject ? '5' : '6'}. Creating generation script file...`);
    
    if (isExistingProject) {
      console.log("📝 Detected existing project - will modify existing files");
    } else {
      console.log("📝 New project - will create fresh codebase");
    }

    const generationScript = `const { query } = require('@anthropic-ai/claude-code');
const fs = require('fs');

async function generateWebsite() {
  // Check if this is an existing project
  const hasExistingFiles = fs.existsSync('app') || fs.existsSync('src') || fs.existsSync('pages');
  
  const prompt = \`${
    prompt ||
    "Create a modern blog website with markdown support and a dark theme"
  }
  
  ${isExistingProject ? `
  IMPORTANT: This is an EXISTING project modification request.
  - ANALYZE the existing codebase first
  - PRESERVE existing functionality and structure
  - Only MODIFY or ADD files as needed for the requested changes
  - DO NOT recreate the entire project from scratch
  - Keep existing dependencies unless new ones are needed
  - Maintain the current app structure and routing
  ` : `
  IMPORTANT: This is a NEW project creation request.
  - Create a NextJS app with TypeScript and Tailwind CSS
  - Use the app directory structure
  - Create all files in the current directory
  - Include a package.json with all necessary dependencies
  - Make the design modern and responsive
  - Add at least a home page and one other page
  - Include proper navigation between pages
  `}
  
  MANDATORY DESIGN SYSTEM - Apply these Sleek Web3 UI principles:
  
  1. Typography & Fonts:
     - Use system font stack only: font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif
     - NO external fonts (no Google Fonts, no custom fonts)
     - Headings: bold and large (text-3xl to text-5xl, font-bold, leading-tight)
     - Body text: text-base to text-lg with relaxed line height (leading-relaxed)
  
  2. Color Scheme & Background:
     - Dark background with subtle teal gradient: bg-gradient-to-br from-gray-900 via-gray-900 to-teal-900
     - Add faint grid overlay using CSS: background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0); background-size: 20px 20px
     - Primary accent color: teal-400 (#2dd4bf)
     - High contrast text: white for headings, gray-200 for body
     - Clear visual hierarchy with proper contrast ratios
  
  3. Layout & Spacing:
     - Container max-width: 1200px (max-w-6xl)
     - Center all content horizontally
     - Generous whitespace with proper padding and margins
     - Use gap-8 to gap-16 for section spacing
  
  4. Components & Cards:
     - All cards: rounded-xl to rounded-2xl (12-16px border radius)
     - Translucent borders: border border-gray-800 or border-white/10
     - Soft shadows: shadow-xl 
     - Background: bg-gray-800/30 or bg-black/20
  
  5. Buttons:
     - Primary buttons: pill-shaped (rounded-full), 44px tall (h-11), solid teal background (bg-teal-400), black text (text-black)
     - Secondary buttons: ghost style with teal border (border border-teal-400 text-teal-400 bg-transparent), same dimensions
     - Hover states with 150-200ms transitions: hover:bg-teal-500, hover:scale-105
  
  6. Animations & Transitions:
     - Minimal motion: only 150-200ms transitions for hover/focus states
     - Use transition-all duration-200 ease-in-out
     - Subtle hover effects: scale-105 or brightness adjustments
     - NO complex animations, keep it clean and professional
  
  7. Code Quality & Tailwind CSS:
     - Use semantic, accessible HTML elements
     - Proper heading hierarchy (h1, h2, h3)
     - Alt text for all images
     - NO heavy libraries beyond NextJS and Tailwind
     - Clean, minimal code structure
     - IMPORTANT: Only use STANDARD Tailwind CSS classes - no custom classes like 'border-border', 'text-foreground', 'bg-background'
     - Use standard colors: gray-50, gray-100, gray-200...gray-900, black, white, teal-400, etc.
     - Avoid shadcn/ui or custom CSS variables - stick to default Tailwind classes only
  
  8. Overall Aesthetic:
     - Clean, modern, and professional appearance
     - Web3 SaaS landing page feel, NOT generic template
     - Consistent spacing and alignment
     - Professional color palette with teal accents
     - High-quality, polished finish
  
  These design principles are MANDATORY and must be applied to every page and component. The result should look like a premium Web3 application, not a basic template.
  \`;

  console.log('Starting website generation with Claude Code...');
  console.log('Working directory:', process.cwd());
  
  const messages = [];
  const abortController = new AbortController();
  
  try {
    for await (const message of query({
      prompt: prompt,
      abortController: abortController,
      options: {
        maxTurns: 20,
        allowedTools: [
          'Read',
          'Write',
          'Edit',
          'MultiEdit',
          'Bash',
          'LS',
          'Glob',
          'Grep'
        ]
      }
    })) {
      messages.push(message);
      
      // Log progress
      if (message.type === 'text') {
        console.log('[Claude]:', (message.text || '').substring(0, 80) + '...');
        console.log('__CLAUDE_MESSAGE__', JSON.stringify({ type: 'assistant', content: message.text }));
      } else if (message.type === 'tool_use') {
        console.log('[Tool]:', message.name, message.input?.file_path || '');
        console.log('__TOOL_USE__', JSON.stringify({ 
          type: 'tool_use', 
          name: message.name, 
          input: message.input 
        }));
      } else if (message.type === 'result') {
        console.log('__TOOL_RESULT__', JSON.stringify({ 
          type: 'tool_result', 
          result: message.result 
        }));
      }
    }
    
    console.log('\\nGeneration complete!');
    console.log('Total messages:', messages.length);
    
    // Save generation log
    fs.writeFileSync('generation-log.json', JSON.stringify(messages, null, 2));
    
    // List generated files
    const files = fs.readdirSync('.').filter(f => !f.startsWith('.'));
    console.log('\\nGenerated files:', files.join(', '));
    
  } catch (error) {
    console.error('Generation error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

generateWebsite().catch(console.error);`;

    // Write the script to a file
    await sandbox.process.executeCommand(
      `cat > generate.js << 'SCRIPT_EOF'
${generationScript}
SCRIPT_EOF`,
      projectDir
    );
    console.log("✓ Generation script written to generate.js");

    // Verify the script was created
    const checkScript = await sandbox.process.executeCommand(
      "ls -la generate.js && head -5 generate.js",
      projectDir
    );
    console.log("Script verification:", checkScript.result);

    // Step 7: Run the generation script
    console.log(`\n${isExistingProject ? '6' : '7'}. Running Claude Code generation...`);
    console.log(`Prompt: "${prompt || "Create a modern blog website"}"`);
    console.log("\nThis may take several minutes...\n");

    const genResult = await sandbox.process.executeCommand(
      "node generate.js",
      projectDir,
      {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        NODE_PATH: `${projectDir}/node_modules`,
      },
      600000 // 10 minute timeout
    );

    console.log("\nGeneration output:");
    console.log(genResult.result);

    if (genResult.exitCode !== 0) {
      throw new Error("Generation failed");
    }

    // Step 8: Check generated files
    console.log(`\n${isExistingProject ? '7' : '8'}. Checking generated files...`);
    const filesResult = await sandbox.process.executeCommand(
      "ls -la",
      projectDir
    );
    console.log(filesResult.result);

    // Step 9: Install dependencies if package.json was updated
    const hasNextJS = await sandbox.process.executeCommand(
      "test -f package.json && grep -q next package.json && echo yes || echo no",
      projectDir
    );

    if (hasNextJS.result?.trim() === "yes") {
      console.log(`\n${isExistingProject ? '8' : '9'}. Installing project dependencies...`);
      const npmInstall = await sandbox.process.executeCommand(
        "npm install",
        projectDir,
        undefined,
        300000 // 5 minute timeout
      );

      if (npmInstall.exitCode !== 0) {
        console.log("Warning: npm install had issues:", npmInstall.result);
      } else {
        console.log("✓ Dependencies installed");
      }

      // Step 10: Create startup script and start dev server
      console.log(`\n${isExistingProject ? '9' : '10'}. Creating startup script and starting development server...`);

      // Create a startup script that will restart the dev server
      const startupScript = `#!/bin/bash
# Auto-restart development server script
cd "${projectDir}"

# Kill any existing dev servers
pkill -f "npm run dev" || true
pkill -f "next dev" || true

# Wait a moment
sleep 2

# Start the development server in background
nohup npm run dev > dev-server.log 2>&1 &

echo "Development server started at $(date)"
`;

      await sandbox.process.executeCommand(
        `cat > startup-dev.sh << 'EOF'
${startupScript}
EOF`,
        await sandbox.getUserRootDir()
      );

      // Make it executable
      await sandbox.process.executeCommand(
        `chmod +x startup-dev.sh`,
        await sandbox.getUserRootDir()
      );

      // Create a cron job to run the startup script on reboot/wake
      await sandbox.process.executeCommand(
        `(crontab -l 2>/dev/null; echo "@reboot ${await sandbox.getUserRootDir()}/startup-dev.sh") | crontab -`,
        await sandbox.getUserRootDir()
      );

      // Start the server in background using nohup
      await sandbox.process.executeCommand(
        `nohup npm run dev > dev-server.log 2>&1 &`,
        projectDir,
        { PORT: "3000" }
      );

      console.log("✓ Server started in background and startup script created");

      // Wait a bit for server to initialize
      console.log("Waiting for server to start...");
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Check if server is running
      const checkServer = await sandbox.process.executeCommand(
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'failed'",
        projectDir
      );

      if (checkServer.result?.trim() === '200') {
        console.log("✓ Server is running!");
      } else {
        console.log("⚠️  Server might still be starting...");
        console.log("You can check logs with: cat dev-server.log");
      }
    }

    // Step 11: Get preview URL
    console.log(`\n${isExistingProject ? '10' : '11'}. Getting preview URL...`);
    const preview = await sandbox.getPreviewLink(3000);

    console.log("\n✨ SUCCESS! Website generated!");
    console.log("\n📊 SUMMARY:");
    console.log("===========");
    console.log(`Sandbox ID: ${sandboxId}`);
    console.log(`Project Directory: ${projectDir}`);
    console.log(`Preview URL: ${preview.url}`);
    if (preview.token) {
      console.log(`Access Token: ${preview.token}`);
    }

    console.log("\n🌐 VISIT YOUR WEBSITE:");
    console.log(preview.url);

    console.log("\n💡 TIPS:");
    console.log("- The sandbox will stay active for debugging");
    console.log("- Server logs: SSH in and run 'cat website-project/dev-server.log'");
    console.log(
      `- To get preview URL again: npx tsx scripts/get-preview-url.ts ${sandboxId}`
    );
    console.log(
      `- To reuse this sandbox: npx tsx scripts/generate-in-daytona.ts ${sandboxId}`
    );
    console.log(`- To remove: npx tsx scripts/remove-sandbox.ts ${sandboxId}`);

    return {
      success: true,
      sandboxId: sandboxId,
      projectDir: projectDir,
      previewUrl: preview.url,
    };
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);

    if (sandbox) {
      console.log(`\nSandbox ID: ${sandboxId}`);
      console.log("The sandbox is still running for debugging.");

      // Try to get debug info
      try {
        const debugInfo = await sandbox.process.executeCommand(
          "pwd && echo '---' && ls -la && echo '---' && test -f generate.js && cat generate.js | head -20 || echo 'No script'",
          `${await sandbox.getUserRootDir()}/website-project`
        );
        console.log("\nDebug info:");
        console.log(debugInfo.result);
      } catch (e) {
        // Ignore
      }
    }

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
    // Check if first arg is a sandbox ID (UUID format)
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
    prompt =
      "Create a modern blog website with markdown support and a dark theme. Include a home page, blog listing page, and individual blog post pages.";
  }

  console.log("📝 Configuration:");
  console.log(
    `- Sandbox: ${sandboxId ? `Using existing ${sandboxId}` : "Creating new"}`
  );
  console.log(`- Prompt: ${prompt}`);
  console.log();

  try {
    await generateWebsiteInDaytona(sandboxId, prompt);
  } catch (error) {
    console.error("Failed to generate website:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Exiting... The sandbox will continue running.");
  process.exit(0);
});

main();
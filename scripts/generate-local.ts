import { query } from "@anthropic-ai/claude-code";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import * as dotenv from "dotenv";

// Load environment variables from multiple possible locations
dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function generateLocalWebsite(projectDir: string, userPrompt: string) {
  console.log("🚀 Starting local website generation...\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY must be set");
    process.exit(1);
  }

  if (!fs.existsSync(projectDir)) {
    console.error(`ERROR: Project directory does not exist: ${projectDir}`);
    process.exit(1);
  }

  try {
    console.log(`🔧 SETUP_ENV: Working in directory: ${projectDir}`);
    
    // Change to project directory
    process.chdir(projectDir);
    
    // Enhanced prompt with modern Web3 design principles
    const enhancedPrompt = `${userPrompt}
  
  Important requirements:
  - Create a NextJS app with TypeScript and Tailwind CSS
  - Use the app directory structure
  - Create all files in the current directory
  - Include a package.json with all necessary dependencies
  - Make the design modern and responsive
  - Add at least a home page and one other page
  - Include proper navigation between pages
  
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
  
  These design principles are MANDATORY and must be applied to every page and component. The result should look like a premium Web3 application, not a basic template.`;

    console.log('🚀 ANALYZE_REQ: Starting website generation with Claude Code...');
    console.log('📋 PLAN_DESIGN: Enhanced prompt applied with Web3 design principles');
    
    const messages = [];
    const abortController = new AbortController();
    
    // Execute Claude Code generation
    for await (const message of query({
      prompt: enhancedPrompt,
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
    
    console.log('\nGeneration complete!');
    console.log('Total messages:', messages.length);
    
    // Save generation log
    fs.writeFileSync('generation-log.json', JSON.stringify(messages, null, 2));
    
    // List generated files
    const files = fs.readdirSync('.').filter(f => !f.startsWith('.'));
    console.log('Generated files:', files.join(', '));
    
    // Check if we have a Next.js project
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        console.log('\n📦 INSTALL_DEPS: Installing dependencies...');
        
        // Install dependencies
        await new Promise<void>((resolve, reject) => {
          const install = spawn('npm', ['install'], {
            stdio: 'pipe',
            cwd: projectDir
          });
          
          install.on('exit', (code) => {
            if (code === 0) {
              console.log('✅ DEPS_DONE: Dependencies installed');
              resolve();
            } else {
              console.log('⚠️ DEPS_WARN: Dependency installation had issues');
              resolve(); // Continue anyway
            }
          });
          
          install.on('error', (err) => {
            console.log('⚠️  Install error:', err.message);
            resolve(); // Continue anyway
          });
        });
        
        // Find available port starting from 3001
        const findAvailablePort = async (startPort: number): Promise<number> => {
          const net = await import('net');
          
          return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(startPort, () => {
              const port = (server.address() as any)?.port;
              server.close(() => resolve(port));
            });
            server.on('error', () => {
              findAvailablePort(startPort + 1).then(resolve);
            });
          });
        };
        
        const port = await findAvailablePort(3001);
        console.log(`\n🚀 START_SERVER: Starting development server on port ${port}...`);
        
        // Start dev server
        const devServer = spawn('npm', ['run', 'dev'], {
          stdio: 'pipe',
          cwd: projectDir,
          env: {
            ...process.env,
            PORT: port.toString()
          }
        });
        
        // Wait a bit for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`✅ SERVER_READY: Server running on port ${port}`);
        console.log(`🌐 PREVIEW_URL: http://localhost:${port}`);
        
        // Keep the process alive to maintain the dev server
        process.on('SIGINT', () => {
          console.log('\n👋 Shutting down dev server...');
          devServer.kill();
          process.exit(0);
        });
        
        // Keep process alive
        await new Promise(() => {}); // This will keep the process running
        
      } else {
        console.log('✅ Static files generated (not a Next.js project)');
      }
    } else {
      console.log('✅ Files generated (no package.json found)');
    }
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: npx tsx generate-local.ts <projectDir> <prompt>");
    process.exit(1);
  }
  
  const projectDir = args[0];
  const prompt = args.slice(1).join(' ');
  
  console.log("📝 Local Generation Configuration:");
  console.log(`- Project Directory: ${projectDir}`);
  console.log(`- Prompt: ${prompt}`);
  console.log();
  
  try {
    await generateLocalWebsite(projectDir, prompt);
  } catch (error) {
    console.error("Failed to generate website:", error);
    process.exit(1);
  }
}

main();
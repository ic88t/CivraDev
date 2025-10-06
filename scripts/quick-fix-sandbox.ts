import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function quickFix(sandboxId: string) {
  const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY! });

  const sandboxes = await daytona.list();
  const sandbox = sandboxes.find((s: any) => s.id === sandboxId);
  if (!sandbox) throw new Error("Sandbox not found");

  const rootDir = await sandbox.getUserRootDir();
  const projectDir = `${rootDir}/website-project`;

  console.log("1. Updating package.json with compatible versions...");

  const newPackageJson = `{
  "name": "modern-landing",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "15.1.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}`;

  await sandbox.process.executeCommand(
    `cat > package.json << 'EOF'\n${newPackageJson}\nEOF`,
    projectDir
  );

  console.log("2. Installing dependencies...");
  const install = await sandbox.process.executeCommand(
    "npm install --legacy-peer-deps",
    projectDir,
    undefined,
    600000
  );

  if (install.exitCode !== 0) {
    console.error("Install failed:", install.result);
    process.exit(1);
  }

  console.log("3. Starting dev server...");
  await sandbox.process.executeCommand(
    `pkill -f "next dev" || true`,
    projectDir
  );

  await sandbox.process.executeCommand(
    `nohup npm run dev > dev-server.log 2>&1 &`,
    projectDir,
    { PORT: "3000" }
  );

  console.log("4. Waiting for server...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  const preview = await sandbox.getPreviewLink(3000);
  console.log(`\n✅ Fixed! Preview: ${preview.url}`);
}

quickFix(process.argv[2]);

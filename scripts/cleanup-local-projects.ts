import * as fs from "fs";
import * as path from "path";

async function cleanupLocalProjects() {
  const tempDir = path.join(process.cwd(), "temp");
  
  if (!fs.existsSync(tempDir)) {
    console.log("No temp directory found, nothing to clean up.");
    return;
  }
  
  const projects = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  let cleanedCount = 0;
  
  for (const project of projects) {
    if (!project.startsWith("local-project-")) continue;
    
    const projectPath = path.join(tempDir, project);
    const stats = fs.statSync(projectPath);
    const age = now - stats.birthtime.getTime();
    
    if (age > maxAge) {
      console.log(`Cleaning up old project: ${project}`);
      fs.rmSync(projectPath, { recursive: true, force: true });
      cleanedCount++;
    }
  }
  
  console.log(`Cleaned up ${cleanedCount} old project(s).`);
  
  // Remove temp directory if empty
  const remaining = fs.readdirSync(tempDir);
  if (remaining.length === 0) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("Removed empty temp directory.");
  }
}

cleanupLocalProjects().catch(console.error);
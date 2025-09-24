import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log("[LOCAL API] Starting local generation for prompt:", prompt);
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start the async generation
    (async () => {
      try {
        // Create a unique project directory
        const projectId = `local-project-${Date.now()}`;
        const projectDir = path.join(process.cwd(), "temp", projectId);
        
        // Ensure temp directory exists
        await fs.promises.mkdir(path.dirname(projectDir), { recursive: true });
        await fs.promises.mkdir(projectDir, { recursive: true });
        
        console.log(`[LOCAL API] Created project directory: ${projectDir}`);
        
        // Send initial progress
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "progress", 
            message: `Creating local project: ${projectId}` 
          })}\n\n`)
        );
        
        // Use the generate-local script from the correct working directory
        const scriptPath = path.join(process.cwd(), "scripts-temp", "generate-local.ts");
        const child = spawn("npx", ["tsx", scriptPath, projectDir, prompt], {
          cwd: process.cwd(), // Ensure we're in the right directory
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
            NODE_PATH: path.join(process.cwd(), "node_modules"),
          },
        });
        
        let buffer = "";
        let devServerPort = 3001; // Default port for local dev server
        
        // Capture stdout
        child.stdout.on("data", async (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            // Parse Claude messages
            if (line.includes('__CLAUDE_MESSAGE__')) {
              const jsonStart = line.indexOf('__CLAUDE_MESSAGE__') + '__CLAUDE_MESSAGE__'.length;
              try {
                const message = JSON.parse(line.substring(jsonStart).trim());
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "claude_message", 
                    content: message.content 
                  })}\n\n`)
                );
              } catch (e) {
                // Ignore parse errors
              }
            }
            // Parse tool uses
            else if (line.includes('__TOOL_USE__')) {
              const jsonStart = line.indexOf('__TOOL_USE__') + '__TOOL_USE__'.length;
              try {
                const toolUse = JSON.parse(line.substring(jsonStart).trim());
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "tool_use", 
                    name: toolUse.name,
                    input: toolUse.input 
                  })}\n\n`)
                );
              } catch (e) {
                // Ignore parse errors
              }
            }
            // Regular progress messages
            else {
              const output = line.trim();
              
              // Filter out internal logs and send as progress
              if (output && 
                  !output.includes('[Claude]:') && 
                  !output.includes('[Tool]:') &&
                  !output.includes('__')) {
                
                // Parse structured progress messages
                let messageType = "progress";
                let step = "";
                let content = output;
                
                // Extract structured step markers
                if (output.includes('SETUP_ENV:')) {
                  step = "setup";
                  content = output.replace(/🔧 SETUP_ENV: /, '');
                } else if (output.includes('ANALYZE_REQ:')) {
                  step = "analyze";
                  content = output.replace(/🚀 ANALYZE_REQ: /, '');
                } else if (output.includes('PLAN_DESIGN:')) {
                  step = "plan";
                  content = output.replace(/📋 PLAN_DESIGN: /, '');
                } else if (output.includes('INSTALL_DEPS:')) {
                  step = "dependencies";
                  content = output.replace(/📦 INSTALL_DEPS: /, '');
                } else if (output.includes('DEPS_DONE:')) {
                  step = "dependencies";
                  content = output.replace(/✅ DEPS_DONE: /, '');
                } else if (output.includes('START_SERVER:')) {
                  step = "server";
                  content = output.replace(/🚀 START_SERVER: /, '');
                } else if (output.includes('SERVER_READY:')) {
                  step = "server";
                  content = output.replace(/✅ SERVER_READY: /, '');
                } else if (output.includes('PREVIEW_URL:')) {
                  step = "server";
                  content = output.replace(/🌐 PREVIEW_URL: /, '');
                  // Extract dev server port
                  const urlMatch = content.match(/localhost:(\d+)/);
                  if (urlMatch) {
                    devServerPort = parseInt(urlMatch[1]);
                  }
                }
                
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: messageType,
                    step: step,
                    message: content,
                    originalMessage: output
                  })}\n\n`)
                );
              }
            }
          }
        });
        
        // Capture stderr
        child.stderr.on("data", async (data) => {
          const error = data.toString();
          console.error("[LOCAL Error]:", error);
          
          // Only send actual errors, not debug info
          if (error.includes("Error") || error.includes("Failed")) {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ 
                type: "error", 
                message: error.trim() 
              })}\n\n`)
            );
          }
        });
        
        // Wait for process to complete
        await new Promise((resolve, reject) => {
          child.on("exit", (code) => {
            if (code === 0) {
              resolve(code);
            } else {
              reject(new Error(`Process exited with code ${code}`));
            }
          });
          
          child.on("error", reject);
        });
        
        // Send completion with local URL and fallback message
        const localUrl = `http://localhost:${devServerPort}`;
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "complete", 
            projectId,
            previewUrl: localUrl,
            isLocal: true,
            message: `✅ Local generation complete! Your app is running at ${localUrl}`
          })}\n\n`)
        );
        
        console.log(`[LOCAL API] Generation complete. Local URL: ${localUrl}`);
        
        // Send done signal
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (error: any) {
        console.error("[LOCAL API] Error during generation:", error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: "error", 
            message: error.message 
          })}\n\n`)
        );
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally {
        await writer.close();
      }
    })();
    
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
    
  } catch (error: any) {
    console.error("[LOCAL API] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
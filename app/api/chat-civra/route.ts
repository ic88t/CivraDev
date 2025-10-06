import { NextRequest } from "next/server";
import { trackUsageWithCredits, hasCredits } from "@/lib/credits";
import { getCurrentUserFromRequest, getCurrentUser } from "@/lib/auth-utils";
import { parseCivraResponse, hasCodeOperations } from "@/lib/civra-parser";
import { createClient } from '@supabase/supabase-js';
import fs from "fs";
import path from "path";

// Read the comprehensive Civra agent prompt
const CIVRA_PROMPT = fs.readFileSync(
  path.join(process.cwd(), "lib", "civra-agent-prompt.md"),
  "utf-8"
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to save chat message
async function saveChatMessage(
  projectId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
) {
  try {
    await supabase.from('chat_messages').insert([
      {
        project_id: projectId,
        role,
        content,
      },
    ]);
  } catch (error) {
    console.error('[saveChatMessage] Error:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sandboxId, message, conversationHistory = [] } = await req.json();

    if (!sandboxId || !message) {
      return new Response(
        JSON.stringify({ error: "sandboxId and message are required" }),
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

    // Check if user has sufficient message credits
    const hasEnoughCredits = await hasCredits(user.id, "message", 1);
    if (!hasEnoughCredits) {
      return new Response(
        JSON.stringify({
          error:
            "Insufficient message credits. Please upgrade your plan to continue.",
          needsUpgrade: true,
          creditType: "message",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API keys not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[CIVRA-CHAT] Continuing chat in sandbox: ${sandboxId}`);
    console.log(`[CIVRA-CHAT] User message: ${message}`);

    // Track usage and consume credits
    const usageResult = await trackUsageWithCredits(
      user.id,
      "CHAT_MESSAGE",
      "message",
      1,
      { message: message.substring(0, 100), sandboxId }
    );

    if (!usageResult.success) {
      return new Response(
        JSON.stringify({
          error: usageResult.error || "Failed to process request",
          needsUpgrade: usageResult.error?.includes("Insufficient"),
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    // Set up Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    let streamClosed = false;

    // Helper function to safely write and close stream
    const safeWrite = async (data: string) => {
      if (!streamClosed) {
        try {
          await writer.write(encoder.encode(data));
        } catch (error) {
          console.error("[CIVRA-CHAT] Error writing to stream:", error);
          streamClosed = true;
        }
      }
    };

    const safeClose = () => {
      if (!streamClosed) {
        streamClosed = true;
        try {
          writer.close();
        } catch (error) {
          // Stream already closed, ignore
        }
      }
    };

    // Start the async chat process
    (async () => {
      try {
        // Dynamic import to avoid ESM issues during build
        const { Daytona } = await import("@daytonaio/sdk");

        const daytona = new Daytona({
          apiKey: process.env.DAYTONA_API_KEY,
        });

        // Get sandbox
        const sandboxes = await daytona.list();
        const sandbox = sandboxes.find((s: any) => s.id === sandboxId);

        if (!sandbox) {
          await safeWrite(
            `data: ${JSON.stringify({
              type: "error",
              content: "Sandbox not found",
            })}\n\n`
          );
          safeClose();
          return;
        }

        // Get project directory
        const rootDir = await sandbox.getUserRootDir();
        const projectDir = `${rootDir}/website-project`;

        // Check if project exists
        const projectCheck = await sandbox.process.executeCommand(
          `test -d website-project && echo "exists" || echo "not found"`,
          rootDir
        );

        if (projectCheck.result?.trim() !== "exists") {
          await safeWrite(
            `data: ${JSON.stringify({
              type: "error",
              content:
                "Project directory not found. Please generate a project first.",
            })}\n\n`
          );
          safeClose();
          return;
        }

        await safeWrite(
          `data: ${JSON.stringify({
            type: "status",
            content: "Reading project files...",
          })}\n\n`
        );

        // Get file structure for context
        const fileTree = await sandbox.process.executeCommand(
          `find . -type f -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" | head -50`,
          projectDir
        );

        // Read allowed files (similar to Civra prompt structure)
        const allowedFiles = [
          "package.json",
          "tsconfig.json",
          "next.config.ts",
          "next.config.js",
          "app/page.tsx",
          "app/layout.tsx",
          "app/globals.css",
          "tailwind.config.ts",
        ];

        let codeContext = "## Current Project Files\n\n";

        for (const file of allowedFiles) {
          const fileContent = await sandbox.process.executeCommand(
            `cat ${file} 2>/dev/null || echo ""`,
            projectDir
          );

          if (fileContent.result && fileContent.result.trim().length > 0) {
            codeContext += `### ${file}\n\`\`\`\n${fileContent.result}\n\`\`\`\n\n`;
          }
        }

        // Build the system prompt using Civra agent prompt template
        // Insert project context before "First Message Instructions" section
        const systemPrompt = CIVRA_PROMPT.replace(
          "## First Message Instructions",
          `## Current Project Context\n\n${codeContext}\n\n## First Message Instructions`
        );

        await safeWrite(
          `data: ${JSON.stringify({
            type: "status",
            content: "Processing with Civra AI...",
          })}\n\n`
        );

        // Prepare conversation for Claude
        const messages = [
          ...conversationHistory.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: "user",
            content: message,
          },
        ];

        // Call Anthropic API using native https
        const https = await import("https");

        const apiRequestData = JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          system: systemPrompt,
          messages: messages,
        });

        const apiResponse = await new Promise<any>((resolve, reject) => {
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

          const apiReq = https.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(new Error("Invalid JSON response"));
              }
            });
          });

          apiReq.on("error", reject);
          apiReq.write(apiRequestData);
          apiReq.end();
        });

        if (apiResponse.error) {
          throw new Error("API Error: " + JSON.stringify(apiResponse.error));
        }

        const responseText = apiResponse.content[0].text.trim();
        console.log("[CIVRA-CHAT] Claude response:", responseText.substring(0, 500));

        // Send the assistant message
        await safeWrite(
          `data: ${JSON.stringify({
            type: "message",
            content: responseText,
          })}\n\n`
        );

        // Parse Civra response
        const parsed = parseCivraResponse(responseText);

        console.log(`[CIVRA-CHAT] Parsed ${parsed.operations.length} operations`);

        // Execute file operations
        if (parsed.operations.length > 0) {
          await safeWrite(
            `data: ${JSON.stringify({
              type: "status",
              content: `Executing ${parsed.operations.length} file operation(s)...`,
            })}\n\n`
          );

          for (const op of parsed.operations) {
            try {
              if (op.type === "write" && op.filePath && op.content !== undefined) {
                // Ensure directory exists
                const dir = path.dirname(op.filePath);
                if (dir !== ".") {
                  await sandbox.process.executeCommand(
                    `mkdir -p ${dir}`,
                    projectDir
                  );
                }

                // Write file using heredoc (no escaping needed with 'FILE_EOF')
                await sandbox.process.executeCommand(
                  `cat > ${op.filePath} << 'FILE_EOF'\n${op.content}\nFILE_EOF`,
                  projectDir
                );

                await safeWrite(
                  `data: ${JSON.stringify({
                    type: "tool_use",
                    name: "write",
                    input: { file_path: op.filePath },
                  })}\n\n`
                );

                console.log(`[CIVRA-CHAT] Wrote file: ${op.filePath}`);
              } else if (op.type === "delete" && op.filePath) {
                await sandbox.process.executeCommand(
                  `rm -f ${op.filePath}`,
                  projectDir
                );

                await safeWrite(
                  `data: ${JSON.stringify({
                    type: "tool_use",
                    name: "delete",
                    input: { file_path: op.filePath },
                  })}\n\n`
                );

                console.log(`[CIVRA-CHAT] Deleted file: ${op.filePath}`);
              } else if (
                op.type === "rename" &&
                op.originalPath &&
                op.newPath
              ) {
                await sandbox.process.executeCommand(
                  `mv ${op.originalPath} ${op.newPath}`,
                  projectDir
                );

                await safeWrite(
                  `data: ${JSON.stringify({
                    type: "tool_use",
                    name: "rename",
                    input: {
                      original_path: op.originalPath,
                      new_path: op.newPath,
                    },
                  })}\n\n`
                );

                console.log(
                  `[CIVRA-CHAT] Renamed: ${op.originalPath} -> ${op.newPath}`
                );
              } else if (op.type === "add-dependency" && op.package) {
                await sandbox.process.executeCommand(
                  `npm install ${op.package}`,
                  projectDir
                );

                await safeWrite(
                  `data: ${JSON.stringify({
                    type: "tool_use",
                    name: "add-dependency",
                    input: { package: op.package },
                  })}\n\n`
                );

                console.log(`[CIVRA-CHAT] Installed: ${op.package}`);
              }
            } catch (opError) {
              console.error(
                `[CIVRA-CHAT] Failed to execute operation:`,
                opError
              );
              await safeWrite(
                `data: ${JSON.stringify({
                  type: "error",
                  content: `Failed to execute ${op.type} operation: ${opError}`,
                })}\n\n`
              );
            }
          }
        }

        // Get updated preview URL
        let previewUrl = null;
        try {
          const preview = await sandbox.getPreviewLink(3000);
          previewUrl = preview?.url;
        } catch (e) {
          console.log("[CIVRA-CHAT] Could not get preview URL:", e);
        }

        await safeWrite(
          `data: ${JSON.stringify({
            type: "complete",
            previewUrl: previewUrl,
            sandboxId: sandboxId,
          })}\n\n`
        );
      } catch (error) {
        console.error("[CIVRA-CHAT] Error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Chat processing failed";
        await safeWrite(
          `data: ${JSON.stringify({
            type: "error",
            content: errorMessage,
          })}\n\n`
        );
        safeClose();
      } finally {
        safeClose();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[CIVRA-CHAT] Error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to continue chat",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

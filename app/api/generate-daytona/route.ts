import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth-utils";
import { trackUsageWithCredits, hasCredits, canCreateProject } from "@/lib/credits";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Function to generate a clean project summary from the prompt
async function generateProjectSummary(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: `Generate a clean, professional 2-3 word project title for this request: "${prompt}". Examples: "Portfolio Tracker", "NFT Marketplace", "DeFi Platform", "Crypto Wallet". Just return the title, nothing else.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.content[0].text.trim();
    
    // Clean up the response and ensure it's a reasonable length
    const cleanSummary = summary.replace(/["']/g, '').trim();
    return cleanSummary.length > 30 ? cleanSummary.substring(0, 30) : cleanSummary;
  } catch (error) {
    console.error('Error generating project summary:', error);
    // Fallback to simple keyword extraction
    const prompt_lower = prompt.toLowerCase();
    if (prompt_lower.includes('portfolio')) return 'Portfolio Tracker';
    if (prompt_lower.includes('nft') || prompt_lower.includes('marketplace')) return 'NFT Marketplace';
    if (prompt_lower.includes('defi') || prompt_lower.includes('staking')) return 'DeFi Platform';
    if (prompt_lower.includes('dao') || prompt_lower.includes('governance')) return 'DAO Platform';
    if (prompt_lower.includes('token') || prompt_lower.includes('erc20')) return 'Token Manager';
    if (prompt_lower.includes('wallet')) return 'Crypto Wallet';
    if (prompt_lower.includes('game') || prompt_lower.includes('gaming')) return 'Web3 Game';
    if (prompt_lower.includes('exchange') || prompt_lower.includes('swap')) return 'DEX Platform';
    return 'Web3 Application';
  }
}

// Create server-side Supabase client
function createSupabaseServer() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sandboxId } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Try to get user from request first, then fallback to cookies
    let user = await getCurrentUserFromRequest(req);

    if (!user) {
      user = await getCurrentUser();
    }

    if (!user?.email) {
      console.log('[Generate API] No authenticated user found');
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Starting generation for user: ${user.email}`);

    // Check if user has sufficient credits
    const creditType = sandboxId ? 'message' : 'message'; // Both creation and continuation use message credits
    const hasEnoughCredits = await hasCredits(user.id, creditType, 1);
    
    if (!hasEnoughCredits) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient message credits. Please upgrade your plan to continue.",
          needsUpgrade: true,
          creditType: creditType
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    // For new project creation, check project limits
    if (!sandboxId) {
      const canCreate = await canCreateProject(user.id);
      if (!canCreate) {
        return new Response(
          JSON.stringify({ 
            error: "You've reached the maximum number of projects (3) for the free plan. Please upgrade to create more projects.",
            needsUpgrade: true,
            limitType: 'projects'
          }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (!process.env.DAYTONA_API_KEY || !process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing API keys" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createSupabaseServer();

    console.log("[API] Starting Daytona generation for prompt:", prompt);
    if (sandboxId) {
      console.log("[API] Using existing sandbox:", sandboxId);

      // Verify user can access this existing sandbox
      const { data: existingProject } = await supabase
        .from('projects')
        .select(`
          *,
          workspaces (
            workspace_members!inner (user_id)
          )
        `)
        .eq('sandbox_id', sandboxId)
        .or(`user_id.eq.${user.id},workspaces.workspace_members.user_id.eq.${user.id}`)
        .single();

      if (!existingProject) {
        return new Response(
          JSON.stringify({ error: "Access denied to this project" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Track usage and consume credits for project creation or continuation
    const usageResult = await trackUsageWithCredits(
      user.id,
      sandboxId ? "CHAT_MESSAGE" : "PROJECT_CREATION",
      "message",
      1,
      { prompt: prompt.substring(0, 100) }
    );

    if (!usageResult.success) {
      return new Response(
        JSON.stringify({ 
          error: usageResult.error || "Failed to process request",
          needsUpgrade: usageResult.error?.includes("Insufficient") 
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start the async generation
    (async () => {
      try {
        // Use the generate-in-daytona.ts script
        const scriptPath = path.join(process.cwd(), "scripts", "generate-in-daytona.ts");
        // Pass sandboxId as first argument if it exists, then the prompt
        const args = sandboxId ? ["tsx", scriptPath, sandboxId, prompt] : ["tsx", scriptPath, prompt];
        const child = spawn("npx", args, {
          env: {
            ...process.env,
            DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
          },
        });
        
        let extractedSandboxId = "";
        let previewUrl = "";
        let buffer = "";
        
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
            // Parse tool results
            else if (line.includes('__TOOL_RESULT__')) {
              // Skip tool results for now to reduce noise
              continue;
            }
            // Regular progress messages
            else {
              const output = line.trim();
              
              // Filter out internal logs
              if (output && 
                  !output.includes('[Claude]:') && 
                  !output.includes('[Tool]:') &&
                  !output.includes('__')) {
                
                // Send as progress
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: "progress", 
                    message: output 
                  })}\n\n`)
                );
                
                // Extract sandbox ID - try multiple patterns
                const sandboxMatch = output.match(/Sandbox created: ([a-f0-9-]+)/i) || 
                                   output.match(/✓ Sandbox created: ([a-f0-9-]+)/i) ||
                                   output.match(/Sandbox ID: ([a-f0-9-]+)/i);
                if (sandboxMatch) {
                  extractedSandboxId = sandboxMatch[1];
                  console.log(`[API] Captured sandbox ID: ${extractedSandboxId}`);
                }
                
                // Extract preview URL
                const previewMatch = output.match(/Preview URL: (https:\/\/[^\s]+)/);
                if (previewMatch) {
                  previewUrl = previewMatch[1];
                  console.log(`[API] Captured preview URL: ${previewUrl}`);
                }
              }
            }
          }
        });
        
        // Capture stderr
        child.stderr.on("data", async (data) => {
          const error = data.toString();
          console.error("[Daytona Error]:", error);
          
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
        
        // Send completion with preview URL
        if (previewUrl) {
          const finalSandboxId = extractedSandboxId || sandboxId;

          // Save or update project in database
          if (finalSandboxId && !sandboxId) {
            // This is a new project, create it
            try {
              // Generate AI-powered project summary
              console.log('[API] Generating project summary...');
              const projectSummary = await generateProjectSummary(prompt);
              console.log(`[API] Generated project summary: ${projectSummary}`);
              
              await supabase.from('projects').insert([{
                name: projectSummary,
                description: projectSummary,
                prompt: prompt,
                sandbox_id: finalSandboxId,
                preview_url: previewUrl,
                status: 'ACTIVE',
                user_id: user.id,
                workspace_id: null,
                visibility: 'PRIVATE',
              }]);
              console.log(`[API] Created new project in database: ${projectSummary} (${finalSandboxId})`);
            } catch (dbError) {
              console.error("[API] Failed to save project to database:", dbError);
              // Continue anyway, the sandbox was created successfully
            }
          } else if (finalSandboxId) {
            // This is an existing project, update it
            try {
              await supabase
                .from('projects')
                .update({
                  preview_url: previewUrl,
                  status: 'ACTIVE'
                })
                .eq('sandbox_id', finalSandboxId);
              console.log(`[API] Updated existing project in database: ${finalSandboxId}`);
            } catch (dbError) {
              console.error("[API] Failed to update project in database:", dbError);
              // Continue anyway
            }
          }

          await writer.write(
            encoder.encode(`data: ${JSON.stringify({
              type: "complete",
              sandboxId: finalSandboxId,
              previewUrl
            })}\n\n`)
          );
          console.log(`[API] Generation complete. Preview URL: ${previewUrl}`);
        } else {
          throw new Error("Failed to get preview URL");
        }
        
        // Send done signal
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (error: any) {
        console.error("[API] Error during generation:", error);
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
    console.error("[API] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
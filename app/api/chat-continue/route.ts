import { NextRequest } from "next/server";
import { trackUsageWithCredits, hasCredits } from "@/lib/credits";
import { getCurrentUserFromRequest, getCurrentUser } from "@/lib/auth-utils";

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
    const hasEnoughCredits = await hasCredits(user.id, 'message', 1);
    if (!hasEnoughCredits) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient message credits. Please upgrade your plan to continue.",
          needsUpgrade: true,
          creditType: 'message'
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

    console.log(`[CHAT] Continuing chat in sandbox: ${sandboxId}`);
    console.log(`[CHAT] User message: ${message}`);
    
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
          needsUpgrade: usageResult.error?.includes("Insufficient") 
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
          console.error("[CHAT] Error writing to stream:", error);
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
        const { Daytona } = await import('@daytonaio/sdk');
        
        const daytona = new Daytona({
          apiKey: process.env.DAYTONA_API_KEY,
        });

        // Get sandbox
        const sandboxes = await daytona.list();
        const sandbox = sandboxes.find((s: any) => s.id === sandboxId);

        if (!sandbox) {
          await safeWrite(`data: ${JSON.stringify({ 
            type: "error", 
            content: "Sandbox not found" 
          })}\n\n`);
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
          await safeWrite(`data: ${JSON.stringify({ 
            type: "error", 
            content: "Project directory not found. Please generate a project first." 
          })}\n\n`);
          safeClose();
          return;
        }

        await safeWrite(`data: ${JSON.stringify({ 
          type: "status", 
          content: "Checking project environment..." 
        })}\n\n`);

        await safeWrite(`data: ${JSON.stringify({ 
          type: "status", 
          content: "Processing your request..." 
        })}\n\n`);

        // Create a truly intelligent script that uses Claude API to analyze and modify files
        // This is exactly how Lovable/v0 would work - let Claude examine the project and make smart changes
        console.log('[CHAT] Creating truly intelligent modification script...');

        const escapedMessage = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const escapedHistory = JSON.stringify(conversationHistory).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        const intelligentScript = `const fs = require('fs');
const https = require('https');

async function makeAnthropicRequest(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    console.log('Making API request with payload size:', data.length);

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      console.log('API Response status:', res.statusCode);
      console.log('API Response headers:', res.headers);
      
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('Raw API response body:', body.substring(0, 500) + '...');
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          console.error('Failed to parse API response as JSON:', e);
          reject(new Error('Invalid JSON response: ' + body.substring(0, 200)));
        }
      });
    });

    req.on('error', (error) => {
      console.error('HTTPS request error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function intelligentModification() {
  try {
    console.log('Starting Lovable-style intelligent modification...');
    
    const userMessage = "${escapedMessage}";
    console.log('User request:', userMessage);
    console.log('API Key available:', !!process.env.ANTHROPIC_API_KEY);
    
    // Get project structure - read key files that Claude might need to modify
    const projectFiles = {};
    const filesToRead = [
      'package.json',
      'app/globals.css', 
      'app/layout.tsx',
      'app/layout.js', 
      'app/page.tsx',
      'app/page.js'
    ];
    
    console.log('Reading project files...');
    for (const file of filesToRead) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          // Truncate large files to keep prompt manageable
          projectFiles[file] = content.length > 1000 ? content.substring(0, 1000) + '\\n// ... truncated ...' : content;
          console.log(\`Read \${file}: \${content.length} chars\`);
        } catch (e) {
          console.log(\`Could not read \${file}:\`, e.message);
        }
      }
    }
    
    // Create intelligent prompt that asks Claude to decide what to modify
    const analysisPrompt = \`You are an expert React/Next.js developer helping modify a project.

USER REQUEST: "\${userMessage}"

CURRENT PROJECT FILES:
\${Object.entries(projectFiles).map(([file, content]) => \`
=== \${file} ===
\${content}
\`).join('')}

Analyze the user's request and determine what files need to be modified. 

RESPOND WITH ONLY VALID JSON - NO OTHER TEXT, NO MARKDOWN, NO EXPLANATIONS:

{
  "analysis": "Brief explanation of what you'll do",
  "files": [
    {
      "path": "relative/file/path.ext",
      "action": "edit",
      "content": "complete new file content"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Return ONLY the JSON object above, nothing else
- Use proper JSON escaping for quotes and newlines in content
- Provide complete file content, not just changes
- Keep existing functionality unless explicitly asked to remove it
- For styling changes, prefer modifying globals.css
- Use double quotes for all JSON keys and values\`;

    console.log('Prompt length:', analysisPrompt.length);
    
    const response = await makeAnthropicRequest(analysisPrompt);
    
    console.log('API Response received');
    console.log('Response structure:', Object.keys(response));
    
    if (response.error) {
      throw new Error('API Error: ' + JSON.stringify(response.error));
    }
    
    if (!response.content || !response.content[0]) {
      throw new Error('No content in response: ' + JSON.stringify(response));
    }
    
    const responseText = response.content[0].text.trim();
    console.log('Response length:', responseText.length);
    console.log('Response preview:', responseText.substring(0, 300) + '...');
    
    // Parse Claude's response
    let analysisResult;
    try {
      console.log('Full response text:', responseText);
      
      // Try multiple approaches to extract JSON
      let jsonString = null;
      
      // Method 1: Look for JSON block markers
      const jsonBlockMatch = responseText.match(/\`\`\`json([\\s\\S]*?)\`\`\`/);
      if (jsonBlockMatch) {
        jsonString = jsonBlockMatch[1].trim();
        console.log('Found JSON in code block');
      }
      
      // Method 2: Look for JSON object pattern
      if (!jsonString) {
        const jsonMatch = responseText.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log('Found JSON object pattern');
        }
      }
      
      // Method 3: Try to find the first { and last }
      if (!jsonString) {
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonString = responseText.substring(firstBrace, lastBrace + 1);
          console.log('Extracted JSON by brace matching');
        }
      }
      
      if (!jsonString) {
        throw new Error('No JSON found in response');
      }
      
      console.log('JSON to parse (first 500 chars):', jsonString.substring(0, 500));
      
      // Clean and validate JSON string
      jsonString = jsonString.trim();
      
      // Try parsing as-is first
      try {
        analysisResult = JSON.parse(jsonString);
        console.log('Successfully parsed Claude analysis');
      } catch (directParseError) {
        console.log('Direct parse failed, trying with escaping...');
        
        // If direct parsing fails, try with escaping
        let cleanedJson = jsonString;
        // Fix common issues
        cleanedJson = cleanedJson.replace(/([^\\\\])\\n/g, '$1\\\\n'); // Escape unescaped newlines
        cleanedJson = cleanedJson.replace(/([^\\\\])\\t/g, '$1\\\\t'); // Escape unescaped tabs
        cleanedJson = cleanedJson.replace(/([^\\\\])\\r/g, '$1\\\\r'); // Escape unescaped carriage returns
        
        analysisResult = JSON.parse(cleanedJson);
        console.log('Successfully parsed Claude analysis after cleaning');
      }
      
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      console.error('Raw response text (first 2000 chars):', responseText.substring(0, 2000));
      
      // Fallback: try to create a simple response structure
      console.log('Attempting fallback response structure...');
      analysisResult = {
        reasoning: "Failed to parse Claude response, creating fallback",
        modifications: []
      };
      console.log('Using fallback response structure');
    }
    
    // Apply modifications suggested by Claude
    let appliedModifications = [];
    
    // Handle both old and new response formats
    const modifications = analysisResult.modifications || analysisResult.files || [];
    
    if (modifications && Array.isArray(modifications)) {
      for (const file of modifications) {
        try {
          console.log(\`Applying modification to: \${file.path}\`);
          
          if (file.action === 'edit' || file.action === 'create') {
            // Ensure directory exists
            const dir = require('path').dirname(file.path);
            if (dir !== '.' && !fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            // Write the new content
            fs.writeFileSync(file.path, file.content || '');
            appliedModifications.push(file.path);
            
            console.log('__MODIFICATION__', JSON.stringify({
              type: 'file_edit',
              file: file.path,
              action: \`Modified based on: \${userMessage}\`
            }));
            
          } else if (file.action === 'delete') {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
              appliedModifications.push(file.path);
              
              console.log('__MODIFICATION__', JSON.stringify({
                type: 'file_delete',
                file: file.path,
                action: \`Deleted: \${file.path}\`
              }));
            }
          }
          
        } catch (fileError) {
          console.error(\`Failed to modify \${file.path}:\`, fileError);
        }
      }
    }
    
    if (appliedModifications.length > 0) {
      console.log('__SUCCESS__', JSON.stringify({
        analysis: analysisResult.analysis,
        message: \`Successfully applied changes to \${appliedModifications.length} file(s)!\`,
        modifications: appliedModifications
      }));
    } else {
      console.log('__NO_MODIFICATIONS__', JSON.stringify({
        message: analysisResult.analysis || 'Claude analyzed the request but determined no modifications were needed.',
        suggestion: 'Try being more specific about what you want to change.'
      }));
    }
    
  } catch (error) {
    console.error('=== DETAILED ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('API Key present:', !!process.env.ANTHROPIC_API_KEY);
    
    console.log('__ERROR__', JSON.stringify({
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    }));
  }
}

intelligentModification().catch(console.error);`;

        // Write the intelligent script
        await sandbox.process.executeCommand(
          `cat > intelligent-modify.js << 'SCRIPT_EOF'
${intelligentScript}
SCRIPT_EOF`,
          projectDir
        );

        await safeWrite(`data: ${JSON.stringify({ 
          type: "status", 
          content: "Analyzing your project structure..." 
        })}\n\n`);

        // Execute the intelligent script with API key
        const chatResult = await sandbox.process.executeCommand(
          "node intelligent-modify.js",
          projectDir,
          {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ""
          },
          120000 // 2 minute timeout
        );

        // Parse the output for structured messages
        const output = chatResult.result || "";
        const lines = output.split('\n');
        
        console.log('[CHAT] Script output:', output);
        
        for (const line of lines) {
          if (line.includes('__MODIFICATION__')) {
            try {
              const modData = JSON.parse(line.split('__MODIFICATION__')[1].trim());
              await safeWrite(`data: ${JSON.stringify({ 
                type: "tool_use", 
                name: modData.type === 'file_edit' ? 'edit' : 'modify',
                input: { file_path: modData.file }
              })}\n\n`);
              
              await safeWrite(`data: ${JSON.stringify({ 
                type: "message", 
                content: modData.action 
              })}\n\n`);
            } catch (e) {
              console.log('[CHAT] Failed to parse modification:', e);
            }
          } else if (line.includes('__SUCCESS__')) {
            try {
              const successData = JSON.parse(line.split('__SUCCESS__')[1].trim());
              await safeWrite(`data: ${JSON.stringify({ 
                type: "message", 
                content: successData.message 
              })}\n\n`);
            } catch (e) {
              console.log('[CHAT] Failed to parse success:', e);
            }
          } else if (line.includes('__ERROR__')) {
            try {
              const errorData = JSON.parse(line.split('__ERROR__')[1].trim());
              await safeWrite(`data: ${JSON.stringify({ 
                type: "error", 
                content: errorData.error 
              })}\n\n`);
            } catch (e) {
              console.log('[CHAT] Failed to parse error:', e);
            }
          } else if (line.includes('__NO_MODIFICATIONS__')) {
            try {
              const noModData = JSON.parse(line.split('__NO_MODIFICATIONS__')[1].trim());
              await safeWrite(`data: ${JSON.stringify({ 
                type: "message", 
                content: noModData.message + " " + (noModData.suggestion || '') 
              })}\n\n`);
            } catch (e) {
              console.log('[CHAT] Failed to parse no modifications:', e);
            }
          }
        }

        if (chatResult.exitCode !== 0) {
          await safeWrite(`data: ${JSON.stringify({ 
            type: "error", 
            content: "Chat processing failed: " + chatResult.result 
          })}\n\n`);
          safeClose();
          return;
        }

        // Get updated preview URL
        let previewUrl = null;
        try {
          const preview = await sandbox.getPreviewLink(3000);
          previewUrl = preview?.url;
        } catch (e) {
          console.log('[CHAT] Could not get preview URL:', e);
        }

        await safeWrite(`data: ${JSON.stringify({ 
          type: "complete", 
          previewUrl: previewUrl,
          sandboxId: sandboxId
        })}\n\n`);

      } catch (error) {
        console.error("[CHAT] Error:", error);
        await safeWrite(`data: ${JSON.stringify({ 
          type: "error", 
          content: error.message || "Chat processing failed" 
        })}\n\n`);
        safeClose();
      } finally {
        safeClose();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("[CHAT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to continue chat" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}
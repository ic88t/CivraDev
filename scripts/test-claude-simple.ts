import * as dotenv from "dotenv";
import * as path from "path";
import * as https from "https";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

async function testClaude() {
  const prompt = `Create a simple Next.js app with a package.json file.

Use this format:

<dec-code>
<dec-write file_path="package.json">
{
  "name": "test-app",
  "scripts": {
    "dev": "next dev"
  },
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  }
}
</dec-write>

<dec-write file_path="app/page.tsx">
export default function Home() {
  return <h1>Hello World</h1>;
}
</dec-write>
</dec-code>`;

  const data = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: prompt,
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
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const response = JSON.parse(body);
          console.log("=== CLAUDE RESPONSE ===");
          console.log(JSON.stringify(response, null, 2));
          console.log("\n=== TEXT CONTENT ===");
          if (response.content && response.content[0]) {
            console.log(response.content[0].text);
          }
          resolve(response);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

testClaude().catch(console.error);

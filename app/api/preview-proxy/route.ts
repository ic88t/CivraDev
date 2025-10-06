import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return new Response("Missing preview URL", { status: 400 });
    }

    // Fetch the Daytona preview with the skip warning header
    const response = await fetch(url, {
      headers: {
        "X-Daytona-Skip-Preview-Warning": "true",
      },
    });

    if (!response.ok) {
      return new Response("Failed to fetch preview", { status: response.status });
    }

    const html = await response.text();

    // Inject base tag to fix relative URLs for assets
    const baseUrl = new URL(url).origin;
    const htmlWithBase = html.replace(
      /<head>/i,
      `<head>\n  <base href="${baseUrl}/">`
    );

    // Return the HTML with proper headers
    return new Response(htmlWithBase, {
      headers: {
        "Content-Type": "text/html",
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors *",
      },
    });
  } catch (error) {
    console.error("[PREVIEW-PROXY] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

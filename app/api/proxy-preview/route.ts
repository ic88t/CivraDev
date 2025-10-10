import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to fetch Daytona preview URLs with warning skip header
 * This allows ScreenshotOne to capture screenshots without the warning page
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    console.log('[PROXY-PREVIEW] Fetching:', targetUrl);

    // Fetch the preview URL with the Daytona warning skip header
    const response = await fetch(targetUrl, {
      headers: {
        'X-Daytona-Skip-Preview-Warning': 'true',
      },
    });

    if (!response.ok) {
      console.error('[PROXY-PREVIEW] Error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch preview: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the HTML content
    const html = await response.text();

    // Return the HTML with appropriate headers
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('[PROXY-PREVIEW] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

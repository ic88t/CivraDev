import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('[TEST-SCREENSHOT] Testing ScreenshotOne API...');

    const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
    const secretKey = process.env.SCREENSHOTONE_SECRET_KEY;

    console.log('[TEST-SCREENSHOT] Access Key:', accessKey ? 'Found' : 'Missing');
    console.log('[TEST-SCREENSHOT] Secret Key:', secretKey ? 'Found' : 'Missing');

    if (!accessKey) {
      return NextResponse.json({ error: 'Access key not configured' }, { status: 500 });
    }

    const crypto = await import('crypto');

    // Test with a simple URL
    const testUrl = 'https://example.com';

    const params = new URLSearchParams({
      access_key: accessKey,
      url: testUrl,
      viewport_width: '1280',
      viewport_height: '720',
      format: 'png',
    });

    let finalUrl = `https://api.screenshotone.com/take?${params.toString()}`;

    if (secretKey) {
      const queryString = params.toString();
      const signature = crypto.createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');

      params.set('signature', signature);
      finalUrl = `https://api.screenshotone.com/take?${params.toString()}`;
    }

    console.log('[TEST-SCREENSHOT] Request URL:', finalUrl);

    const response = await fetch(finalUrl);

    console.log('[TEST-SCREENSHOT] Response status:', response.status);
    console.log('[TEST-SCREENSHOT] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TEST-SCREENSHOT] Error response:', errorText);
      return NextResponse.json({
        error: 'Screenshot API failed',
        status: response.status,
        details: errorText
      }, { status: 500 });
    }

    const contentType = response.headers.get('content-type');
    console.log('[TEST-SCREENSHOT] Content-Type:', contentType);

    return NextResponse.json({
      success: true,
      message: 'Screenshot API is working!',
      status: response.status,
      contentType: contentType,
    });

  } catch (error) {
    console.error('[TEST-SCREENSHOT] Error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

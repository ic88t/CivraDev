import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromRequest, getCurrentUser } from '@/lib/auth-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Capture screenshot using Screenshot Service (Production-ready)
 * Uses ScreenshotOne API instead of Puppeteer
 * Works on Vercel, Netlify, and all serverless platforms
 */
export async function POST(
  req: NextRequest,
  context: { params: { projectId: string } }
) {
  try {
    const { projectId } = context.params;
    console.log('[SCREENSHOT-SERVICE] Starting screenshot capture for project:', projectId);

    // Authenticate user
    let user = await getCurrentUserFromRequest(req);
    if (!user) {
      user = await getCurrentUser();
    }

    console.log('[SCREENSHOT-SERVICE] User authenticated:', user?.id ? 'Yes' : 'No');

    if (!user?.id) {
      console.log('[SCREENSHOT-SERVICE] Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get project
    console.log('[SCREENSHOT-SERVICE] Fetching project from database...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, preview_url, user_id, sandbox_id, screenshot_url')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('[SCREENSHOT-SERVICE] Database error:', projectError);
      return NextResponse.json(
        { error: 'Database error', details: projectError.message },
        { status: 500 }
      );
    }

    if (!project) {
      console.log('[SCREENSHOT-SERVICE] Project not found');
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('[SCREENSHOT-SERVICE] Project found:', { id: project.id, hasPreviewUrl: !!project.preview_url });

    if (project.user_id !== user.id) {
      console.log('[SCREENSHOT-SERVICE] User not authorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!project.preview_url) {
      console.log('[SCREENSHOT-SERVICE] No preview URL available');
      return NextResponse.json(
        { error: 'No preview URL available' },
        { status: 400 }
      );
    }

    // Use ScreenshotOne API
    const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
    const secretKey = process.env.SCREENSHOTONE_SECRET_KEY;

    if (!accessKey) {
      return NextResponse.json(
        { error: 'Screenshot service not configured' },
        { status: 500 }
      );
    }

    console.log(`[SCREENSHOT-SERVICE] Capturing screenshot for project ${projectId}`);

    // Build ScreenshotOne API URL (signed URL with HMAC-SHA256)
    const crypto = await import('crypto');

    // Determine which URL to use for screenshots
    let screenshotUrl = project.preview_url;

    // In production, use our proxy to add X-Daytona-Skip-Preview-Warning header
    // In development (localhost), use direct URL since ScreenshotOne can't reach localhost proxy
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.includes('localhost')) {
      // Production: use proxy to skip warning page
      screenshotUrl = `${appUrl}/api/proxy-preview?url=${encodeURIComponent(project.preview_url)}`;
      console.log('[SCREENSHOT-SERVICE] Using proxy URL to skip Daytona warning');
    } else {
      // Development: use direct URL (warning page may appear in screenshot)
      console.log('[SCREENSHOT-SERVICE] Using direct URL (development mode)');
    }

    // Prepare query string
    const params = new URLSearchParams({
      access_key: accessKey,
      url: screenshotUrl,
      viewport_width: '1280',
      viewport_height: '720',
      format: 'png',
      block_ads: 'true',
      delay: '2',
    });

    // Generate signature if secret key is provided
    let finalUrl = `https://api.screenshotone.com/take?${params.toString()}`;

    if (secretKey) {
      const queryString = params.toString();
      const signature = crypto.createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');

      params.set('signature', signature);
      finalUrl = `https://api.screenshotone.com/take?${params.toString()}`;
    }

    console.log(`[SCREENSHOT-SERVICE] Requesting screenshot from ScreenshotOne...`);

    // Fetch screenshot
    const response = await fetch(finalUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SCREENSHOT-SERVICE] ScreenshotOne API error:', response.status, errorText);
      throw new Error(`Screenshot service failed: ${response.statusText} - ${errorText}`);
    }

    console.log('[SCREENSHOT-SERVICE] Screenshot fetched successfully, uploading to storage...');
    const screenshotBuffer = await response.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `${user.id}/${projectId}-${Date.now()}.png`;

    // Delete old screenshot if exists
    if (project.screenshot_url) {
      try {
        const oldFileName = project.screenshot_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('project-screenshots')
            .remove([`${user.id}/${oldFileName}`]);
        }
      } catch (deleteError) {
        console.log('[SCREENSHOT-SERVICE] Could not delete old screenshot:', deleteError);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('project-screenshots')
      .upload(fileName, screenshotBuffer, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('[SCREENSHOT-SERVICE] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload screenshot' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-screenshots')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update project
    const { error: updateError } = await supabase
      .from('projects')
      .update({ screenshot_url: publicUrl })
      .eq('id', projectId);

    if (updateError) {
      console.error('[SCREENSHOT-SERVICE] Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    console.log(`[SCREENSHOT-SERVICE] Successfully captured screenshot for project ${projectId}`);

    return NextResponse.json({
      success: true,
      screenshot_url: publicUrl,
    });

  } catch (error) {
    console.error('[SCREENSHOT-SERVICE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromRequest, getCurrentUser } from '@/lib/auth-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Capture screenshot of a project's preview URL
 * POST /api/projects/[projectId]/screenshot
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;

    // Authenticate user
    let user = await getCurrentUserFromRequest(req);
    if (!user) {
      user = await getCurrentUser();
    }

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, preview_url, user_id, sandbox_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!project.preview_url) {
      return NextResponse.json(
        { error: 'No preview URL available for this project' },
        { status: 400 }
      );
    }

    // Import Puppeteer dynamically
    let browser;
    try {
      const puppeteer = await import('puppeteer');

      console.log(`[SCREENSHOT] Launching browser for project ${projectId}`);
      browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set viewport for consistent screenshots
      await page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
      });

      console.log(`[SCREENSHOT] Navigating to ${project.preview_url}`);

      // Navigate to preview URL with timeout
      await page.goto(project.preview_url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait a bit for any animations to settle
      await page.waitForTimeout(2000);

      console.log('[SCREENSHOT] Capturing screenshot');

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      await browser.close();

      // Upload to Supabase Storage with user-based folder structure
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
          console.log('[SCREENSHOT] Could not delete old screenshot:', deleteError);
        }
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-screenshots')
        .upload(fileName, screenshot, {
          contentType: 'image/png',
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[SCREENSHOT] Upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload screenshot', details: uploadError.message },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-screenshots')
        .getPublicUrl(fileName);

      const screenshotUrl = urlData.publicUrl;

      // Update project with screenshot URL
      const { error: updateError } = await supabase
        .from('projects')
        .update({ screenshot_url: screenshotUrl })
        .eq('id', projectId);

      if (updateError) {
        console.error('[SCREENSHOT] Database update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update project' },
          { status: 500 }
        );
      }

      console.log(`[SCREENSHOT] Successfully captured and saved screenshot for project ${projectId}`);

      return NextResponse.json({
        success: true,
        screenshot_url: screenshotUrl,
      });
    } catch (puppeteerError) {
      if (browser) {
        await browser.close();
      }

      console.error('[SCREENSHOT] Puppeteer error:', puppeteerError);
      return NextResponse.json(
        {
          error: 'Failed to capture screenshot',
          details: puppeteerError instanceof Error ? puppeteerError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[SCREENSHOT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

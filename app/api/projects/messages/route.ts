import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Retrieve chat messages for a project
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const sandboxId = searchParams.get('sandboxId');

    if (!projectId && !sandboxId) {
      return NextResponse.json({ error: 'projectId or sandboxId is required' }, { status: 400 });
    }

    let finalProjectId = projectId;

    // If sandboxId provided, look up the project
    if (sandboxId && !projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('sandbox_id', sandboxId)
        .single();

      if (projectError || !project) {
        console.error('[Messages API] Project not found for sandbox:', sandboxId, projectError);
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      finalProjectId = project.id;
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', finalProjectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Messages API] Error fetching messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    console.error('[Messages API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Save a new chat message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, role, content } = body;

    if (!projectId || !role || !content) {
      return NextResponse.json(
        { error: 'projectId, role, and content are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be user, assistant, or system' },
        { status: 400 }
      );
    }

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          project_id: projectId,
          role,
          content,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[Messages API] Error saving message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('[Messages API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

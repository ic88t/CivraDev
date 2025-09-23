import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromRequest, requireAuth } from "@/lib/auth-utils";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Create server-side Supabase client
function createSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// GET /api/workspaces/[id] - Get workspace details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const workspaceId = params.id;

    // Get workspace with member check
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        projects: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
    });

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "Workspace not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get current user's role
    const currentMember = workspace.members.find(member => member.userId === user.id);
    const userRole = currentMember?.role || 'VIEWER';

    // Format the response
    const formattedWorkspace = {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      memberCount: workspace._count.members,
      projectCount: workspace._count.projects,
      userRole: userRole,
      members: workspace.members.map(member => ({
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user,
      })),
      projects: workspace.projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        visibility: project.visibility,
        sandboxId: project.sandboxId,
        previewUrl: project.previewUrl,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        user: project.user,
      })),
    };

    return new Response(
      JSON.stringify({ workspace: formattedWorkspace }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[API] Error fetching workspace:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch workspace" }),
      {
        status: error.message === "Authentication required" ? 401 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// PUT /api/workspaces/[id] - Update workspace
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const { name, description } = await req.json();
    const workspaceId = params.id;

    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Workspace name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user has permission to update (OWNER or ADMIN)
    const currentMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    if (!currentMember) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions to update workspace" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update workspace
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
    });

    return new Response(
      JSON.stringify({
        workspace: {
          id: updatedWorkspace.id,
          name: updatedWorkspace.name,
          description: updatedWorkspace.description,
          createdAt: updatedWorkspace.createdAt,
          updatedAt: updatedWorkspace.updatedAt,
          memberCount: updatedWorkspace._count.members,
          projectCount: updatedWorkspace._count.projects,
          userRole: currentMember.role,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[API] Error updating workspace:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to update workspace" }),
      {
        status: error.message === "Authentication required" ? 401 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// DELETE /api/workspaces/[id] - Delete workspace
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const workspaceId = params.id;

    // Check if user is the owner
    const currentMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
        role: "OWNER",
      },
    });

    if (!currentMember) {
      return new Response(
        JSON.stringify({ error: "Only workspace owners can delete workspaces" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete workspace (cascade will handle members and projects)
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[API] Error deleting workspace:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete workspace" }),
      {
        status: error.message === "Authentication required" ? 401 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

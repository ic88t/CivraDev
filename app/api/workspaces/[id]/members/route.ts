import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromRequest, requireAuth } from "@/lib/auth-utils";

export const dynamic = 'force-dynamic';

// POST /api/workspaces/[id]/members - Invite user to workspace
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return new Response(
    JSON.stringify({ error: "Workspace member management not implemented yet" }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
  try {
    const user = await requireAuth();
    const { email, role = "EDITOR" } = await req.json();
    const workspaceId = params.id;

    if (!email?.trim()) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user has permission to invite (OWNER or ADMIN)
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
        JSON.stringify({ error: "Insufficient permissions to invite members" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find the user to invite
    const invitedUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!invitedUser) {
      return new Response(
        JSON.stringify({ error: "User not found. They may need to sign up first." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: invitedUser.id,
      },
    });

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: "User is already a member of this workspace" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Add user to workspace
    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitedUser.id,
        role: role as any,
      },
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
    });

    return new Response(
      JSON.stringify({
        member: {
          id: newMember.id,
          role: newMember.role,
          joinedAt: newMember.joinedAt,
          user: newMember.user,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[API] Error inviting member:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to invite member" }),
      {
        status: error.message === "Authentication required" ? 401 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// DELETE /api/workspaces/[id]/members - Remove member from workspace
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return new Response(
    JSON.stringify({ error: "Workspace member management not implemented yet" }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
  try {
    const user = await requireAuth();
    const { memberId } = await req.json();
    const workspaceId = params.id;

    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "Member ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the member to remove
    const memberToRemove = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!memberToRemove) {
      return new Response(
        JSON.stringify({ error: "Member not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check permissions
    const currentMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
    });

    if (!currentMember) {
      return new Response(
        JSON.stringify({ error: "You are not a member of this workspace" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Users can remove themselves, or OWNER/ADMIN can remove others
    const canRemove =
      memberToRemove.userId === user.id || // Self removal
      (currentMember.role === "OWNER") || // Owner can remove anyone
      (currentMember.role === "ADMIN" && memberToRemove.role !== "OWNER"); // Admin can remove non-owners

    if (!canRemove) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions to remove this member" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Don't allow removing the last owner
    if (memberToRemove.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return new Response(
          JSON.stringify({ error: "Cannot remove the last owner. Transfer ownership first." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Remove the member
    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[API] Error removing member:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to remove member" }),
      {
        status: error.message === "Authentication required" ? 401 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
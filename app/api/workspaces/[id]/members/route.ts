import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

// POST /api/workspaces/[id]/members - Invite user to workspace
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return new Response(
    JSON.stringify({ error: "Workspace member management not implemented yet" }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
}

// DELETE /api/workspaces/[id]/members - Remove member from workspace
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return new Response(
    JSON.stringify({ error: "Workspace member management not implemented yet" }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
}
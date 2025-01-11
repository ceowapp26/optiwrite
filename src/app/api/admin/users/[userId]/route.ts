import { NextRequest, NextResponse } from 'next/server';
import { GoogleSessionManager } from '@/utils/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await GoogleSessionManager.getAdminUser(
      params.userId,
    );
    return NextResponse.json(currentUser);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update admin user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userData = await req.json();
    const updatedUser = await GoogleSessionManager.updateAdminUser(
      params.userId,
      userData
    );
    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update admin user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await GoogleSessionManager.deleteAdminUser(params.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete admin user' },
      { status: 500 }
    );
  }
}
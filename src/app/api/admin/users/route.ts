import { NextRequest, NextResponse } from 'next/server';
import { GoogleSessionManager } from '@/utils/storage';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const users = await GoogleSessionManager.getAdminUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch admin users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const userData = await req.json();
    const newUser = await GoogleSessionManager.createAdminUser(userData);
    return NextResponse.json(newUser);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}


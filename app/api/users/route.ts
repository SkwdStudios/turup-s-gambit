import { NextResponse } from 'next/server';
import { userService } from '@/lib/services/user';

export async function POST(request: Request) {
  try {
    const userData = await request.json();
    const user = await userService.createUser(userData);
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 400 }
    );
  }
}
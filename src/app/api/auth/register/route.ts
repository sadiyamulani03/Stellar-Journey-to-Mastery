import { NextResponse } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  const walletAddress = body?.walletAddress ? String(body.walletAddress).trim() : undefined;

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  try {
    if (getUserByUsername(username)) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = createUser(username, passwordHash, walletAddress);
    const token = signToken(user.id);
    const response = NextResponse.json({ user: { id: user.id, username: user.username, walletAddress: user.walletAddress, createdAt: user.createdAt } });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Registration failed.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getUserById, updateUserWallet } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PATCH(request: Request) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid authentication token.' }, { status: 401 });
  }

  let body: { walletAddress?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const walletAddress = String(body?.walletAddress || '').trim();
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address is required.' }, { status: 400 });
  }

  const updated = updateUserWallet(payload.sub, walletAddress);
  if (!updated) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const user = getUserById(updated.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    },
  });
}

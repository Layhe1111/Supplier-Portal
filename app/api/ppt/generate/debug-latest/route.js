import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const requireUser = async (request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing auth token' }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { error: NextResponse.json({ error: 'Invalid auth token' }, { status: 401 }) };
  }

  return { user: data.user };
};

export async function GET(request) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const file = join(process.cwd(), 'tmp', 'ppt-latest-request.json');
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Debug payload not found' }, { status: 404 });
  }
}

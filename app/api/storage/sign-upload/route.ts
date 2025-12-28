import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, contentType } = await request.json();
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'supplier-files';
    const objectPath = `${authData.user.id}/${Date.now()}-${fileName}`;

    const { data: signed, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath);

    if (error || !signed) {
      return NextResponse.json({ error: error?.message || 'Failed to create signed URL' }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: signed.signedUrl,
      path: objectPath,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Unexpected error' },
      { status: 500 }
    );
  }
}

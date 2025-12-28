import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const requireUser = async (request: Request) => {
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

const toText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toPath = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toPathArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toPath(item))
    .filter((item): item is string => Boolean(item));
};

const toInt = (value: unknown) => {
  if (value == null || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toFloat = (value: unknown) => {
  if (value == null || value === '') return null;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const hasAnyText = (...values: unknown[]) =>
  values.some((value) => typeof value === 'string' && value.trim().length > 0);

const ensureOk = (result: { error: { message: string } | null }, context: string) => {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
};

const saveProducts = async (supplierId: string, products: unknown) => {
  const deleteProducts = await supabaseAdmin
    .from('products')
    .delete()
    .match({ supplier_id: supplierId });
  ensureOk(deleteProducts, 'Delete products');

  const filtered = (Array.isArray(products) ? products : [])
    .filter((product) =>
      hasAnyText(product?.productName, product?.category, product?.brand)
    )
    .map((product) => ({
      product,
      row: {
        supplier_id: supplierId,
        sku: toText(product.sku),
        product_name: toText(product.productName),
        category: toText(product.category),
        brand: toText(product.brand),
        series: toText(product.series),
        spec: toText(product.spec),
        material: toText(product.material),
        unit_price: toFloat(product.unitPrice),
        moq: toInt(product.moq),
        origin: toText(product.origin),
        lead_time_days: toInt(product.leadTime),
        current_stock: toInt(product.currentStock),
        specification_link: toText(product.specificationLink),
      },
    }));

  if (filtered.length === 0) return;

  const insertProducts = await supabaseAdmin
    .from('products')
    .insert(filtered.map((item) => item.row))
    .select('id');
  ensureOk(insertProducts, 'Insert products');

  const inserted = insertProducts.data || [];
  const fileRows: any[] = [];
  inserted.forEach((row, index) => {
    const product = filtered[index]?.product;
    const photoPaths = toPathArray(product?.photos);
    photoPaths.forEach((path) => {
      fileRows.push({
        supplier_id: supplierId,
        product_id: row.id,
        file_type: 'photo',
        path,
      });
    });

    const specPath = toPath(product?.specificationFile);
    if (specPath) {
      fileRows.push({
        supplier_id: supplierId,
        product_id: row.id,
        file_type: 'spec',
        path: specPath,
      });
    }

    const modelPath = toPath(product?.model3D);
    if (modelPath) {
      fileRows.push({
        supplier_id: supplierId,
        product_id: row.id,
        file_type: 'model3d',
        path: modelPath,
      });
    }
  });

  if (fileRows.length > 0) {
    const insertFiles = await supabaseAdmin
      .from('product_files')
      .insert(fileRows);
    ensureOk(insertFiles, 'Insert product_files');
  }
};

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    if ('error' in auth) return auth.error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const products = Array.isArray(body.products)
      ? body.products
      : Array.isArray(body?.data?.products)
      ? body.data.products
      : [];

    const supplierResult = await supabaseAdmin
      .from('suppliers')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('supplier_type', 'material')
      .maybeSingle();

    if (supplierResult.error) {
      return NextResponse.json(
        { error: supplierResult.error.message },
        { status: 500 }
      );
    }

    if (!supplierResult.data) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    await saveProducts(supplierResult.data.id, products);

    await supabaseAdmin
      .from('suppliers')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', supplierResult.data.id);

    return NextResponse.json({ ok: true, supplierId: supplierResult.data.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

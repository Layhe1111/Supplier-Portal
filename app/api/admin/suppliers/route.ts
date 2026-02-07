import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SupplierRow = {
  id: string;
  user_id: string;
  supplier_type: string;
  status: string;
  created_at: string | null;
  submitted_at: string | null;
};

const IMPORT_USER_EMAIL_RE = /^directory-import-\d+@example\.com$/i;
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  contractor: 'Contractor / 承包商',
  designer: 'Designer / 設計師',
  material: 'Material/Furniture Supplier / 材料家具供應商',
  basic: 'Other Suppliers / 其他供应商',
};

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

const getUserRole = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return 'user';
  return data?.role || 'user';
};

const requireAdmin = async (request: Request) => {
  const auth = await requireUser(request);
  if (auth.error) return auth;
  const role = await getUserRole(auth.user.id);
  if (role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
};

const normalizeCompanyName = (value: unknown) =>
  (typeof value === 'string' ? value : '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const getTime = (value: string | null | undefined) => {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const SUPPLIER_ID_CHUNK_SIZE = 100;

const fetchCompanyRows = async (supplierIds: string[]) => {
  const chunks = chunkArray(supplierIds, SUPPLIER_ID_CHUNK_SIZE);
  const rows: any[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const result = await supabaseAdmin
      .from('supplier_company')
      .select(
        'supplier_id, company_name_en, company_name_zh, country, office_address, business_type, business_description, company_supplement_link'
      )
      .in('supplier_id', chunk);
    if (result.error) {
      throw new Error(`Fetch supplier_company chunk ${i + 1}/${chunks.length}: ${result.error.message}`);
    }
    rows.push(...(result.data || []));
  }
  return rows;
};

const fetchContactRows = async (supplierIds: string[]) => {
  const chunks = chunkArray(supplierIds, SUPPLIER_ID_CHUNK_SIZE);
  const rows: any[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const result = await supabaseAdmin
      .from('supplier_contact')
      .select(
        'supplier_id, contact_name, contact_position, contact_phone_code, contact_phone, contact_email, contact_fax, submission_date'
      )
      .in('supplier_id', chunk);
    if (result.error) {
      throw new Error(`Fetch supplier_contact chunk ${i + 1}/${chunks.length}: ${result.error.message}`);
    }
    rows.push(...(result.data || []));
  }
  return rows;
};

const fetchBrandsRows = async (supplierIds: string[]) => {
  const chunks = chunkArray(supplierIds, SUPPLIER_ID_CHUNK_SIZE);
  const rows: any[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const result = await supabaseAdmin
      .from('material_represented_brands')
      .select('supplier_id, brand_name')
      .in('supplier_id', chunk)
      .order('created_at', { ascending: true });
    if (result.error) {
      throw new Error(`Fetch material_represented_brands chunk ${i + 1}/${chunks.length}: ${result.error.message}`);
    }
    rows.push(...(result.data || []));
  }
  return rows;
};

const listAllAuthUsers = async () => {
  const users: { id: string; email?: string | null }[] = [];
  let page = 1;
  const perPage = 200;
  let total = 0;
  do {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message || 'Failed to list users');
    }
    const batch = data?.users || [];
    users.push(...batch.map((u) => ({ id: u.id, email: u.email || null })));
    total = data?.total || users.length;
    if (batch.length === 0) break;
    page += 1;
  } while (users.length < total);
  return users;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const suppliersResult = await supabaseAdmin
      .from('suppliers')
      .select('id, user_id, supplier_type, status, submitted_at, created_at')
      .in('status', ['submitted', 'approved', 'rejected']);
    if (suppliersResult.error) {
      return NextResponse.json(
        { error: suppliersResult.error.message || 'Failed to load suppliers' },
        { status: 500 }
      );
    }

    const suppliers = (suppliersResult.data || []) as SupplierRow[];
    const supplierIds = suppliers.map((row) => row.id);
    if (supplierIds.length === 0) {
      return NextResponse.json({ suppliers: [] });
    }

    const [companyRows, contactRows, brandRows] = await Promise.all([
      fetchCompanyRows(supplierIds),
      fetchContactRows(supplierIds),
      fetchBrandsRows(supplierIds),
    ]);

    const companyMap = new Map<string, any>();
    companyRows.forEach((row) => companyMap.set(row.supplier_id, row));
    const contactMap = new Map<string, any>();
    contactRows.forEach((row) => contactMap.set(row.supplier_id, row));
    const brandsMap = new Map<string, string[]>();
    brandRows.forEach((row) => {
      const list = brandsMap.get(row.supplier_id) || [];
      list.push(row.brand_name);
      brandsMap.set(row.supplier_id, list);
    });

    const entries = suppliers
      .map((row) => {
        const company = companyMap.get(row.id);
        const contact = contactMap.get(row.id);
        const supplierType = row.supplier_type || 'basic';
        const companyName = company?.company_name_en || company?.company_name_zh || '';
        const businessType =
          company?.business_type || BUSINESS_TYPE_LABELS[supplierType] || '';
        return {
          supplierId: row.id,
          status: row.status || 'submitted',
          supplierType,
          companyName,
          companyNameChinese: company?.company_name_zh ?? '',
          country: company?.country ?? '',
          officeAddress: company?.office_address ?? '',
          businessType,
          businessDescription: company?.business_description ?? '',
          companySupplementLink: company?.company_supplement_link ?? '',
          submitterName: contact?.contact_name ?? '',
          submitterPosition: contact?.contact_position ?? '',
          submitterPhone: contact?.contact_phone ?? '',
          submitterPhoneCode: contact?.contact_phone_code ?? '+852',
          submitterEmail: contact?.contact_email ?? '',
          contactFax: contact?.contact_fax ?? '',
          submissionDate: contact?.submission_date ?? row.submitted_at ?? '',
          representedBrands: brandsMap.get(row.id) || [],
        };
      })
      .sort((a, b) => {
        const ta = getTime(a.submissionDate);
        const tb = getTime(b.submissionDate);
        return tb - ta;
      });

    return NextResponse.json({ suppliers: entries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const payload = await request.json().catch(() => ({}));
    const action = typeof payload.action === 'string' ? payload.action.trim() : '';
    if (action !== 'resolve_duplicates') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const suppliersResult = await supabaseAdmin
      .from('suppliers')
      .select('id, user_id, supplier_type, status, created_at, submitted_at')
      .in('status', ['submitted', 'approved']);
    if (suppliersResult.error) {
      return NextResponse.json(
        { error: suppliersResult.error.message || 'Failed to load suppliers' },
        { status: 500 }
      );
    }

    const suppliers = (suppliersResult.data || []) as SupplierRow[];
    const supplierIds = suppliers.map((row) => row.id);
    const userIds = Array.from(new Set(suppliers.map((row) => row.user_id).filter(Boolean)));
    if (supplierIds.length === 0) {
      return NextResponse.json({ disabledIds: [], manualReview: [] });
    }

    const [companiesResult, profilesResult, authUsers] = await Promise.all([
      supabaseAdmin
        .from('supplier_company')
        .select('supplier_id, company_name_en')
        .in('supplier_id', supplierIds),
      userIds.length
        ? supabaseAdmin.from('profiles').select('user_id, invite_code_id').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
      listAllAuthUsers(),
    ]);

    if (companiesResult.error) {
      return NextResponse.json(
        { error: companiesResult.error.message || 'Failed to load company data' },
        { status: 500 }
      );
    }
    if (profilesResult.error) {
      return NextResponse.json(
        { error: profilesResult.error.message || 'Failed to load profile data' },
        { status: 500 }
      );
    }

    const companyMap = new Map<string, string>();
    (companiesResult.data || []).forEach((row: any) => {
      companyMap.set(row.supplier_id, row.company_name_en || '');
    });

    const inviteMap = new Map<string, boolean>();
    (profilesResult.data || []).forEach((row: any) => {
      inviteMap.set(row.user_id, Boolean(row.invite_code_id));
    });

    const emailMap = new Map<string, string>();
    authUsers.forEach((user) => {
      emailMap.set(user.id, user.email || '');
    });

    const groups = new Map<string, Array<{
      supplierId: string;
      companyName: string;
      userId: string;
      createdAt: string | null;
      submittedAt: string | null;
      hasInviteCode: boolean;
      isImported: boolean;
      isUserFilled: boolean;
    }>>();

    suppliers.forEach((supplier) => {
      const companyName = companyMap.get(supplier.id) || '';
      const key = normalizeCompanyName(companyName);
      if (!key) return;
      const email = emailMap.get(supplier.user_id) || '';
      const isImported = IMPORT_USER_EMAIL_RE.test(email);
      const item = {
        supplierId: supplier.id,
        companyName: companyName.trim(),
        userId: supplier.user_id,
        createdAt: supplier.created_at,
        submittedAt: supplier.submitted_at,
        hasInviteCode: Boolean(inviteMap.get(supplier.user_id)),
        isImported,
        isUserFilled: !isImported,
      };
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    });

    const toDisable = new Set<string>();
    const manualReview: Array<{ companyName: string; supplierIds: string[]; reason: string }> = [];

    groups.forEach((list) => {
      if (list.length <= 1) return;

      const inviteRows = list.filter((item) => item.hasInviteCode);
      if (inviteRows.length === 1) {
        const keep = inviteRows[0];
        list.forEach((item) => {
          if (item.supplierId !== keep.supplierId) toDisable.add(item.supplierId);
        });
        return;
      }
      if (inviteRows.length > 1) {
        manualReview.push({
          companyName: inviteRows[0].companyName || '(empty)',
          supplierIds: list.map((item) => item.supplierId),
          reason: 'multiple_invite_code_entries',
        });
        return;
      }

      const userFilledRows = list.filter((item) => item.isUserFilled);
      if (userFilledRows.length === 1) {
        const keep = userFilledRows[0];
        list.forEach((item) => {
          if (item.supplierId !== keep.supplierId) toDisable.add(item.supplierId);
        });
        return;
      }
      if (userFilledRows.length > 1) {
        manualReview.push({
          companyName: userFilledRows[0].companyName || '(empty)',
          supplierIds: list.map((item) => item.supplierId),
          reason: 'multiple_user_filled_entries',
        });
        return;
      }

      const sortedImported = list.slice().sort((a, b) => {
        const timeA = getTime(a.submittedAt) || getTime(a.createdAt);
        const timeB = getTime(b.submittedAt) || getTime(b.createdAt);
        return timeA - timeB;
      });
      const keep = sortedImported[0];
      sortedImported.forEach((item) => {
        if (item.supplierId !== keep.supplierId) toDisable.add(item.supplierId);
      });
    });

    const disabledIds = Array.from(toDisable);
    if (disabledIds.length > 0) {
      const updateResult = await supabaseAdmin
        .from('suppliers')
        .update({ status: 'rejected' })
        .in('id', disabledIds);
      if (updateResult.error) {
        return NextResponse.json(
          { error: updateResult.error.message || 'Failed to disable suppliers' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      disabledIds,
      manualReview,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const payload = await request.json().catch(() => ({}));
    const supplierId = typeof payload.supplierId === 'string' ? payload.supplierId.trim() : '';
    const status = typeof payload.status === 'string' ? payload.status.trim() : 'rejected';
    const allowedStatus = new Set(['submitted', 'approved', 'rejected']);
    if (!supplierId) {
      return NextResponse.json({ error: 'Missing supplierId' }, { status: 400 });
    }
    if (!allowedStatus.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await supabaseAdmin
      .from('suppliers')
      .update({ status })
      .eq('id', supplierId)
      .select('id, status')
      .maybeSingle();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to disable supplier' },
        { status: 500 }
      );
    }
    if (!result.data) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ supplierId: result.data.id, status: result.data.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

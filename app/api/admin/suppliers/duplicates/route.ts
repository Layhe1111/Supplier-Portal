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

type DuplicateEntry = {
  supplierId: string;
  userId: string;
  supplierType: string;
  status: string;
  companyName: string;
  hasInviteCode: boolean;
  isImported: boolean;
  isUserFilled: boolean;
  submittedAt: string | null;
  createdAt: string | null;
};

const IMPORT_USER_EMAIL_RE = /^directory-import-\d+@example\.com$/i;

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

const buildDuplicateGroups = async () => {
  const suppliersResult = await supabaseAdmin
    .from('suppliers')
    .select('id, user_id, supplier_type, status, created_at, submitted_at');
  if (suppliersResult.error) {
    throw new Error(suppliersResult.error.message || 'Failed to load suppliers');
  }

  const suppliers = (suppliersResult.data || []) as SupplierRow[];
  const supplierIds = suppliers.map((row) => row.id);
  const userIds = Array.from(new Set(suppliers.map((row) => row.user_id).filter(Boolean)));
  if (supplierIds.length === 0) return [];

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
    throw new Error(companiesResult.error.message || 'Failed to load company data');
  }
  if (profilesResult.error) {
    throw new Error(profilesResult.error.message || 'Failed to load profile data');
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

  const groups = new Map<string, DuplicateEntry[]>();
  suppliers.forEach((supplier) => {
    const companyName = companyMap.get(supplier.id) || '';
    const key = normalizeCompanyName(companyName);
    if (!key) return;
    const email = emailMap.get(supplier.user_id) || '';
    const isImported = IMPORT_USER_EMAIL_RE.test(email);
    const entry: DuplicateEntry = {
      supplierId: supplier.id,
      userId: supplier.user_id,
      supplierType: supplier.supplier_type || 'basic',
      status: supplier.status || 'draft',
      companyName: companyName.trim(),
      hasInviteCode: Boolean(inviteMap.get(supplier.user_id)),
      isImported,
      isUserFilled: !isImported,
      submittedAt: supplier.submitted_at,
      createdAt: supplier.created_at,
    };
    const list = groups.get(key) || [];
    list.push(entry);
    groups.set(key, list);
  });

  return Array.from(groups.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([nameKey, entries]) => {
      const sortedEntries = entries.slice().sort((a, b) => {
        const ta = getTime(a.submittedAt) || getTime(a.createdAt);
        const tb = getTime(b.submittedAt) || getTime(b.createdAt);
        return tb - ta;
      });

      const inviteEntries = sortedEntries.filter((item) => item.hasInviteCode);
      const userFilledEntries = sortedEntries.filter((item) => item.isUserFilled);
      let recommendedSupplierId: string | null = null;
      let reviewReason = '';

      if (inviteEntries.length === 1) {
        recommendedSupplierId = inviteEntries[0].supplierId;
        reviewReason = 'invite_code_priority';
      } else if (inviteEntries.length > 1) {
        reviewReason = 'multiple_invite_code_entries';
      } else if (userFilledEntries.length === 1) {
        recommendedSupplierId = userFilledEntries[0].supplierId;
        reviewReason = 'user_filled_priority';
      } else if (userFilledEntries.length > 1) {
        reviewReason = 'multiple_user_filled_entries';
      } else {
        const oldestImported = sortedEntries
          .slice()
          .sort((a, b) => {
            const ta = getTime(a.submittedAt) || getTime(a.createdAt);
            const tb = getTime(b.submittedAt) || getTime(b.createdAt);
            return ta - tb;
          })[0];
        recommendedSupplierId = oldestImported?.supplierId || null;
        reviewReason = 'imported_oldest_kept';
      }

      return {
        companyNameKey: nameKey,
        companyName: sortedEntries[0]?.companyName || '',
        count: sortedEntries.length,
        recommendedSupplierId,
        reviewReason,
        suppliers: sortedEntries,
      };
    })
    .sort((a, b) => a.companyNameKey.localeCompare(b.companyNameKey));
};

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const groups = await buildDuplicateGroups();
    return NextResponse.json({ groups });
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
    const keepSupplierId =
      typeof payload.keepSupplierId === 'string' ? payload.keepSupplierId.trim() : '';
    if (!keepSupplierId) {
      return NextResponse.json({ error: 'Missing keepSupplierId' }, { status: 400 });
    }

    const keepCompanyRes = await supabaseAdmin
      .from('supplier_company')
      .select('supplier_id, company_name_en')
      .eq('supplier_id', keepSupplierId)
      .maybeSingle();
    if (keepCompanyRes.error) {
      return NextResponse.json(
        { error: keepCompanyRes.error.message || 'Failed to load supplier company' },
        { status: 500 }
      );
    }
    if (!keepCompanyRes.data) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const normalizedName = normalizeCompanyName(keepCompanyRes.data.company_name_en || '');
    if (!normalizedName) {
      return NextResponse.json({ error: 'Supplier company name is empty' }, { status: 400 });
    }

    const groups = await buildDuplicateGroups();
    const group = groups.find((item) => item.companyNameKey === normalizedName);
    if (!group) {
      return NextResponse.json({ error: 'No duplicate group found for this supplier' }, { status: 400 });
    }

    const supplierIds = group.suppliers.map((item) => item.supplierId);
    if (!supplierIds.includes(keepSupplierId)) {
      return NextResponse.json({ error: 'Supplier is not in target duplicate group' }, { status: 400 });
    }

    const rejectIds = supplierIds.filter((id) => id !== keepSupplierId);
    if (rejectIds.length > 0) {
      const rejectRes = await supabaseAdmin
        .from('suppliers')
        .update({ status: 'rejected' })
        .in('id', rejectIds);
      if (rejectRes.error) {
        return NextResponse.json(
          { error: rejectRes.error.message || 'Failed to reject duplicate suppliers' },
          { status: 500 }
        );
      }
    }

    const keepRes = await supabaseAdmin
      .from('suppliers')
      .update({ status: 'approved' })
      .eq('id', keepSupplierId)
      .select('id')
      .maybeSingle();
    if (keepRes.error) {
      return NextResponse.json(
        { error: keepRes.error.message || 'Failed to approve selected supplier' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      approvedSupplierId: keepSupplierId,
      rejectedSupplierIds: rejectIds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

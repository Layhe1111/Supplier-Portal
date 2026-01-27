import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  contractor: 'Contractor / 承包商',
  designer: 'Designer / 設計師',
  material: 'Material/Furniture Supplier / 材料家具供應商',
  basic: 'Other Suppliers / 其他供应商',
};

const getSupabaseHost = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return '';
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

const getServiceRoleInfo = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key || !key.includes('.')) return {};
  const parts = key.split('.');
  if (parts.length < 2) return {};
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return {
      serviceRoleRef: payload.ref,
      serviceRoleRole: payload.role,
    };
  } catch {
    return {};
  }
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const SUPPLIER_ID_CHUNK_SIZE = 100;

const fetchSuppliers = async () => {
  const pageSize = 500;
  let offset = 0;
  let rows: any[] = [];
  let count: number | null = null;

  while (true) {
    const result = await supabaseAdmin
      .from('suppliers')
      .select('id, supplier_type, submitted_at', { count: 'exact' })
      .in('status', ['submitted', 'approved'])
      .range(offset, offset + pageSize - 1);

    if (result.error) {
      return { error: result.error, data: null, count: null };
    }

    if (count == null && typeof result.count === 'number') {
      count = result.count;
    }

    const batch = result.data || [];
    rows = rows.concat(batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return { error: null, data: rows, count };
};

const fetchCompanyRows = async (supplierIds: string[]) => {
  const chunks = chunkArray(supplierIds, SUPPLIER_ID_CHUNK_SIZE);
  const rows: any[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const result = await supabaseAdmin
      .from('supplier_company')
      .select(
        'supplier_id, company_name_en, company_name_zh, country, office_address, business_type, business_type_zh, business_description, company_supplement_link, company_logo_path'
      )
      .in('supplier_id', chunk);
    if (result.error) {
      return {
        error: { message: `Fetch supplier_company chunk ${i + 1}/${chunks.length}: ${result.error.message}` },
        data: null,
      };
    }
    rows.push(...(result.data || []));
  }
  return { error: null, data: rows };
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
      return {
        error: { message: `Fetch supplier_contact chunk ${i + 1}/${chunks.length}: ${result.error.message}` },
        data: null,
      };
    }
    rows.push(...(result.data || []));
  }
  return { error: null, data: rows };
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
      return {
        error: { message: `Fetch material_represented_brands chunk ${i + 1}/${chunks.length}: ${result.error.message}` },
        data: null,
      };
    }
    rows.push(...(result.data || []));
  }
  return { error: null, data: rows };
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === '1';
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const sizeParam = parseInt(url.searchParams.get('pageSize') || '30', 10);
    const q = (url.searchParams.get('q') || '').trim();
    const sortParam = (url.searchParams.get('sort') || 'submitted').trim();
    const typeParam = (url.searchParams.get('type') || 'all').trim();
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const pageSize = Number.isFinite(sizeParam) && sizeParam > 0 ? Math.min(sizeParam, 200) : 30;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    const allowedSort = sortParam === 'alpha' ? 'alpha' : 'submitted';
    const allowedTypes = new Set(['contractor', 'designer', 'material', 'basic']);
    const typeFilter = typeParam || 'all';

    const suppliersResult = await fetchSuppliers();
    if (suppliersResult.error) {
      return NextResponse.json(
        { error: suppliersResult.error.message },
        { status: 500 }
      );
    }

    let supplierRows = suppliersResult.data || [];
    if (typeFilter !== 'all' && allowedTypes.has(typeFilter)) {
      supplierRows = supplierRows.filter((row) => row.supplier_type === typeFilter);
    }

    const supplierIds = supplierRows.map((row) => row.id);
    if (supplierIds.length === 0) {
      if (debug) {
        return NextResponse.json({
          suppliers: [],
          totalCount: 0,
          debug: {
            supabaseHost: getSupabaseHost(),
            ...getServiceRoleInfo(),
            supplierCount: 0,
            supplierCountExact: 0,
            companyCount: 0,
            contactCount: 0,
          },
        }, {
          headers: { 'Cache-Control': 'no-store' },
        });
      }
      return NextResponse.json({
        suppliers: [],
        totalCount: 0,
      });
    }

    const [companiesResult, contactsResult, brandsResult] = await Promise.all([
      fetchCompanyRows(supplierIds),
      fetchContactRows(supplierIds),
      fetchBrandsRows(supplierIds),
    ]);

    if (companiesResult.error || contactsResult.error || brandsResult.error) {
      return NextResponse.json(
        { error: companiesResult.error?.message || contactsResult.error?.message || brandsResult.error?.message || 'Failed to load data' },
        { status: 500 }
      );
    }

    const companyMap = new Map<string, any>();
    (companiesResult.data || []).forEach((row) => companyMap.set(row.supplier_id, row));

    const contactMap = new Map<string, any>();
    (contactsResult.data || []).forEach((row) => contactMap.set(row.supplier_id, row));

    const brandsMap = new Map<string, string[]>();
    (brandsResult.data || []).forEach((row) => {
      const brands = brandsMap.get(row.supplier_id) || [];
      brands.push(row.brand_name);
      brandsMap.set(row.supplier_id, brands);
    });

    // Generate signed URLs for logos
    const logoPathsToSign = new Set<string>();
    (companiesResult.data || []).forEach((row) => {
      if (row.company_logo_path) {
        logoPathsToSign.add(row.company_logo_path);
      }
    });

    const logoUrlMap = new Map<string, string>();
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'supplier-files';
    for (const path of logoPathsToSign) {
      try {
        const { data } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiry
        if (data?.signedUrl) {
          logoUrlMap.set(path, data.signedUrl);
        }
      } catch (err) {
        console.error('Failed to sign logo URL:', path, err);
      }
    }

    const suppliersWithMeta = supplierRows.map((row) => {
      const supplierId = row.id;
      const supplierType = row.supplier_type || 'basic';
      const company = companyMap.get(supplierId);
      const contact = contactMap.get(supplierId);
      const companyName =
        company?.company_name_en || company?.company_name_zh || '';
      const businessType =
        company?.business_type || BUSINESS_TYPE_LABELS[supplierType] || '';
      const submissionSortKey = contact?.submission_date || row.submitted_at || '';
      const sortName = (companyName || company?.company_name_zh || '').trim().toLowerCase();
      const logoPath = company?.company_logo_path;
      const logoUrl = logoPath ? logoUrlMap.get(logoPath) || null : null;
      const brands = brandsMap.get(supplierId) || [];
      return {
        entry: {
          supplierType,
          companyName,
          companyNameChinese: company?.company_name_zh ?? '',
          country: company?.country ?? '',
          officeAddress: company?.office_address ?? '',
          businessType,
          businessDescription: company?.business_description ?? '',
          companySupplementLink: company?.company_supplement_link ?? '',
          companyLogo: logoUrl,
          submitterName: contact?.contact_name ?? '',
          submitterPosition: contact?.contact_position ?? '',
          submitterPhone: contact?.contact_phone ?? '',
          submitterPhoneCode: contact?.contact_phone_code ?? '+852',
          submitterEmail: contact?.contact_email ?? '',
          contactFax: contact?.contact_fax ?? '',
          submissionDate: contact?.submission_date ?? '',
          representedBrands: brands,
        },
        businessTypeZh: company?.business_type_zh ?? '',
        sortName,
        submissionSortKey,
      };
    });

    const query = q.toLowerCase();
    const filtered = suppliersWithMeta.filter(({ entry, businessTypeZh }) => {
      const nameEn = entry.companyName.toLowerCase();
      const nameZh = (entry.companyNameChinese || '').toLowerCase();
      const businessType = entry.businessType.toLowerCase();
      const businessTypeZhLower = (businessTypeZh || '').toLowerCase();
      const businessDescription = (entry.businessDescription || '').toLowerCase();
      const matchesQuery = query
        ? nameEn.includes(query) ||
          nameZh.includes(query) ||
          businessType.includes(query) ||
          businessTypeZhLower.includes(query) ||
          businessDescription.includes(query)
        : true;
      const matchesTypeFilter =
        typeFilter === 'all' || allowedTypes.has(typeFilter)
          ? true
          : businessType.includes(typeFilter.toLowerCase()) ||
            businessTypeZhLower.includes(typeFilter.toLowerCase());
      return matchesQuery && matchesTypeFilter;
    });

    if (allowedSort === 'alpha') {
      filtered.sort((a, b) => {
        if (!a.sortName && !b.sortName) return 0;
        if (!a.sortName) return 1;
        if (!b.sortName) return -1;
        return a.sortName.localeCompare(b.sortName, undefined, { sensitivity: 'base' });
      });
    } else {
      filtered.sort((a, b) => {
        const timeA = a.submissionSortKey ? Date.parse(a.submissionSortKey) : 0;
        const timeB = b.submissionSortKey ? Date.parse(b.submissionSortKey) : 0;
        return timeB - timeA;
      });
    }

    const totalCount = filtered.length;
    const paged = filtered.slice(rangeFrom, rangeTo + 1);
    const suppliers = paged.map((item) => item.entry);

    if (debug) {
      return NextResponse.json({
        suppliers,
        totalCount,
        debug: {
          supabaseHost: getSupabaseHost(),
          ...getServiceRoleInfo(),
          supplierCount: totalCount,
          supplierCountExact: totalCount,
          companyCount: (companiesResult.data || []).length,
          contactCount: (contactsResult.data || []).length,
        },
      }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.json({
      suppliers,
      totalCount,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

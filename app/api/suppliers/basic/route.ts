import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  contractor: 'Contractor / 承包商',
  designer: 'Designer / 設計師',
  material: 'Material Supplier / 材料供應商',
  basic: 'Basic Supplier / 基礎供應商',
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
      .select('id, supplier_type', { count: 'exact' })
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
        'supplier_id, company_name_en, company_name_zh, country, office_address, business_type, business_description, company_supplement_link, company_logo_path'
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === '1';
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const sizeParam = parseInt(url.searchParams.get('pageSize') || '30', 10);
    const q = (url.searchParams.get('q') || '').trim();
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const pageSize = Number.isFinite(sizeParam) && sizeParam > 0 ? Math.min(sizeParam, 200) : 30;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let supplierRows: any[] = [];
    let supplierCountExact: number | null = null;
    let companyRows: any[] = [];

    if (q) {
      const companyResult = await supabaseAdmin
        .from('supplier_company')
        .select(
          'supplier_id, company_name_en, company_name_zh, country, office_address, business_type, business_description, company_supplement_link, company_logo_path',
          { count: 'exact' }
        )
        .or(
          `company_name_en.ilike.%${q}%,company_name_zh.ilike.%${q}%,business_type.ilike.%${q}%`
        )
        .order('company_name_en', { ascending: true, nullsFirst: false })
        .range(rangeFrom, rangeTo);

      if (companyResult.error) {
        return NextResponse.json(
          { error: companyResult.error.message },
          { status: 500 }
        );
      }

      companyRows = companyResult.data || [];
      supplierCountExact = typeof companyResult.count === 'number' ? companyResult.count : null;
      const supplierIds = companyRows.map((row) => row.supplier_id);

      if (supplierIds.length === 0) {
        if (debug) {
          return NextResponse.json({
            suppliers: [],
            totalCount: supplierCountExact ?? 0,
            debug: {
              supabaseHost: getSupabaseHost(),
              ...getServiceRoleInfo(),
              supplierCount: 0,
              supplierCountExact,
              companyCount: (companyRows || []).length,
              contactCount: 0,
            },
          }, {
            headers: { 'Cache-Control': 'no-store' },
          });
        }
        return NextResponse.json({
          suppliers: [],
          totalCount: supplierCountExact ?? 0,
        });
      }

      const suppliersResult = await supabaseAdmin
        .from('suppliers')
        .select('id, supplier_type')
        .in('id', supplierIds);

      if (suppliersResult.error) {
        return NextResponse.json(
          { error: suppliersResult.error.message },
          { status: 500 }
        );
      }

      supplierRows = suppliersResult.data || [];
    } else {
      const suppliersResult = await supabaseAdmin
        .from('suppliers')
        .select('id, supplier_type', { count: 'exact' })
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: false })
        .range(rangeFrom, rangeTo);

      if (suppliersResult.error) {
        return NextResponse.json(
          { error: suppliersResult.error.message },
          { status: 500 }
        );
      }

      supplierRows = suppliersResult.data || [];
      supplierCountExact = typeof suppliersResult.count === 'number' ? suppliersResult.count : null;
    }

    const supplierIds = supplierRows.map((row) => row.id);
    if (supplierIds.length === 0) {
      if (debug) {
        return NextResponse.json({
          suppliers: [],
          totalCount: supplierCountExact ?? 0,
          debug: {
            supabaseHost: getSupabaseHost(),
            ...getServiceRoleInfo(),
            supplierCount: 0,
            supplierCountExact,
            companyCount: 0,
            contactCount: 0,
          },
        }, {
          headers: { 'Cache-Control': 'no-store' },
        });
      }
      return NextResponse.json({
        suppliers: [],
        totalCount: supplierCountExact ?? 0,
      });
    }

    const [companiesResult, contactsResult] = await Promise.all([
      companyRows.length > 0
        ? { error: null, data: companyRows }
        : fetchCompanyRows(supplierIds),
      fetchContactRows(supplierIds),
    ]);

    if (companiesResult.error || contactsResult.error) {
      return NextResponse.json(
        { error: companiesResult.error?.message || contactsResult.error?.message || 'Failed to load data' },
        { status: 500 }
      );
    }

    const companyMap = new Map<string, any>();
    (companiesResult.data || []).forEach((row) => companyMap.set(row.supplier_id, row));

    const contactMap = new Map<string, any>();
    (contactsResult.data || []).forEach((row) => contactMap.set(row.supplier_id, row));

    const suppliers = supplierRows.map((row) => {
      const supplierId = row.id;
      const supplierType = row.supplier_type || 'basic';
      const company = companyMap.get(supplierId);
      const contact = contactMap.get(supplierId);
      const companyName =
        company?.company_name_en || company?.company_name_zh || '';
      const businessType =
        company?.business_type || BUSINESS_TYPE_LABELS[supplierType] || '';
      return {
        supplierType,
        companyName,
        companyNameChinese: company?.company_name_zh ?? '',
        country: company?.country ?? '',
        officeAddress: company?.office_address ?? '',
        businessType,
        businessDescription: company?.business_description ?? '',
        companySupplementLink: company?.company_supplement_link ?? '',
        companyLogo: company?.company_logo_path ?? null,
        submitterName: contact?.contact_name ?? '',
        submitterPosition: contact?.contact_position ?? '',
        submitterPhone: contact?.contact_phone ?? '',
        submitterPhoneCode: contact?.contact_phone_code ?? '+852',
        submitterEmail: contact?.contact_email ?? '',
        contactFax: contact?.contact_fax ?? '',
        submissionDate: contact?.submission_date ?? '',
      };
    });

    if (debug) {
      return NextResponse.json({
        suppliers,
        totalCount: supplierCountExact ?? suppliers.length,
        debug: {
          supabaseHost: getSupabaseHost(),
          ...getServiceRoleInfo(),
          supplierCount: supplierRows.length,
          supplierCountExact,
          companyCount: (companiesResult.data || []).length,
          contactCount: (contactsResult.data || []).length,
        },
      }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.json({
      suppliers,
      totalCount: supplierCountExact ?? suppliers.length,
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

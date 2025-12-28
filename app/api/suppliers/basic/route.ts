import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  contractor: 'Contractor / 承包商',
  designer: 'Designer / 設計師',
  material: 'Material Supplier / 材料供應商',
  basic: 'Basic Supplier / 基礎供應商',
};

export async function GET(_request: Request) {
  try {
    const suppliersResult = await supabaseAdmin
      .from('suppliers')
      .select('id, supplier_type')
      .eq('status', 'submitted');

    if (suppliersResult.error) {
      return NextResponse.json(
        { error: suppliersResult.error.message },
        { status: 500 }
      );
    }

    const supplierRows = suppliersResult.data || [];
    const supplierIds = supplierRows.map((row) => row.id);
    if (supplierIds.length === 0) {
      return NextResponse.json({ suppliers: [] });
    }

    const [companiesResult, contactsResult] = await Promise.all([
      supabaseAdmin
        .from('supplier_company')
        .select(
          'supplier_id, company_name_en, company_name_zh, country, office_address, business_type, business_description, company_supplement_link, company_logo_path'
        )
        .in('supplier_id', supplierIds),
      supabaseAdmin
        .from('supplier_contact')
        .select(
          'supplier_id, contact_name, contact_position, contact_phone_code, contact_phone, contact_email, contact_fax, submission_date'
        )
        .in('supplier_id', supplierIds),
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

    return NextResponse.json({ suppliers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

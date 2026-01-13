import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateOptionalUrl } from '@/lib/urlValidation';

type SupplierStatus = 'draft' | 'submitted';
type SupplierType = 'contractor' | 'designer' | 'material' | 'basic';

const SUPPLIER_TYPES = new Set<SupplierType>([
  'contractor',
  'designer',
  'material',
  'basic',
]);

const BUSINESS_TYPE_LABELS: Record<SupplierType, string> = {
  contractor: 'Contractor / 承包商',
  designer: 'Designer / 設計師',
  material: 'Material/Furniture Supplier / 材料家具供應商',
  basic: 'Other Suppliers / 其他供应商',
};

const YES = new Set(['yes', 'true', '1']);
const NO = new Set(['no', 'false', '0']);

const toText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toTextArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toText(item))
    .filter((item): item is string => Boolean(item));
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

const toPathList = (value: unknown) => {
  if (Array.isArray(value)) return toPathArray(value);
  const single = toPath(value);
  return single ? [single] : [];
};

const getFileName = (path: string) => {
  const parts = path.split('/');
  return parts[parts.length - 1] || null;
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (YES.has(lowered)) return true;
    if (NO.has(lowered)) return false;
  }
  return null;
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

const ensureOk = (result: { error: { message: string } | null }, context: string) => {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
};

const replaceRows = async (table: string, match: Record<string, any>, rows: any[]) => {
  const deleteResult = await supabaseAdmin.from(table).delete().match(match);
  ensureOk(deleteResult, `Delete ${table}`);
  if (rows.length === 0) return;
  const insertResult = await supabaseAdmin.from(table).insert(rows);
  ensureOk(insertResult, `Insert ${table}`);
};

const saveDocumentType = async (
  supplierId: string,
  scope: string,
  docType: string,
  value: unknown
) => {
  const paths = toPathList(value);
  const rows = paths.map((path, index) => ({
    supplier_id: supplierId,
    scope,
    doc_type: docType,
    path,
    file_name: getFileName(path),
    metadata: paths.length > 1 ? { index } : null,
  }));
  await replaceRows('supplier_documents', { supplier_id: supplierId, scope, doc_type: docType }, rows);
};

const saveProjectHighlights = async (
  supplierId: string,
  scope: string,
  projects: any[]
) => {
  const filtered = (projects || [])
    .filter((project) =>
      hasAnyText(
        project?.projectName,
        project?.year,
        project?.address,
        project?.area
      )
    )
    .map((project) => ({
      project,
      row: {
        supplier_id: supplierId,
        scope,
        project_name: toText(project.projectName),
        year: toText(project.year),
        address: toText(project.address),
        area: toText(project.area),
        renovation_type: toText(project.renovationType),
        project_types: toTextArray(project.projectTypes),
        is_highlight: Boolean(project.projectHighlight),
      },
    }));

  const deleteResult = await supabaseAdmin
    .from('project_highlights')
    .delete()
    .match({ supplier_id: supplierId, scope });
  ensureOk(deleteResult, 'Delete project_highlights');

  if (filtered.length === 0) return;

  const insertProjects = await supabaseAdmin
    .from('project_highlights')
    .insert(filtered.map((item) => item.row))
    .select('id');
  ensureOk(insertProjects, 'Insert project_highlights');

  const inserted = insertProjects.data || [];
  const fileRows: any[] = [];
  inserted.forEach((row, index) => {
    const project = filtered[index]?.project;
    const photos = toPathArray(project?.photos);
    photos.forEach((path) => {
      fileRows.push({
        supplier_id: supplierId,
        project_id: row.id,
        file_type: 'photo',
        path,
      });
    });
  });

  if (fileRows.length > 0) {
    const insertFiles = await supabaseAdmin
      .from('project_files')
      .insert(fileRows);
    ensureOk(insertFiles, 'Insert project_files');
  }
};

const saveProjectManagers = async (
  supplierId: string,
  scope: string,
  managers: any[]
) => {
  const deleteManagers = await supabaseAdmin
    .from('project_managers')
    .delete()
    .match({ supplier_id: supplierId, scope });
  ensureOk(deleteManagers, 'Delete project_managers');

  if (!Array.isArray(managers) || managers.length === 0) return;

  const managerRows = managers.map((manager) => ({
    supplier_id: supplierId,
    scope,
    name: toText(manager.name),
    years_experience: toText(manager.yearsExperience),
    languages: toText(manager.languages),
    main_project: toText(manager.mainProject),
    year: toText(manager.year),
    address: toText(manager.address),
    area: toText(manager.area),
    cv_path: toPath(manager.cv),
  }));

  const insertManagers = await supabaseAdmin
    .from('project_managers')
    .insert(managerRows)
    .select('id');
  ensureOk(insertManagers, 'Insert project_managers');

  const managerIds = insertManagers.data || [];
  const projectRows: any[] = [];
  managerIds.forEach((row, index) => {
    const projects = managers[index]?.projects || [];
    projects.forEach((project: any) => {
      if (!hasAnyText(project?.projectName, project?.clientName, project?.year)) return;
      projectRows.push({
        supplier_id: supplierId,
        project_manager_id: row.id,
        project_name: toText(project.projectName),
        client_name: toText(project.clientName),
        year: toText(project.year),
        building_name: toText(project.buildingName),
        area: toText(project.area),
      });
    });
  });

  if (projectRows.length > 0) {
    const insertProjects = await supabaseAdmin
      .from('project_manager_projects')
      .insert(projectRows);
    ensureOk(insertProjects, 'Insert project_manager_projects');
  }
};

const saveDesigners = async (supplierId: string, designers: any[]) => {
  const deleteDesigners = await supabaseAdmin
    .from('designers')
    .delete()
    .match({ supplier_id: supplierId });
  ensureOk(deleteDesigners, 'Delete designers');

  if (!Array.isArray(designers) || designers.length === 0) return;

  const designerRows = designers.map((designer) => ({
    supplier_id: supplierId,
    name: toText(designer.name),
    experience: toText(designer.experience),
    languages: toText(designer.languages),
    cv_path: toPath(designer.cv),
  }));

  const insertDesigners = await supabaseAdmin
    .from('designers')
    .insert(designerRows)
    .select('id');
  ensureOk(insertDesigners, 'Insert designers');

  const designerIds = insertDesigners.data || [];
  const projectRows: any[] = [];
  const projectSources: any[] = [];
  designerIds.forEach((row, index) => {
    const projects = designers[index]?.projects || [];
    projects.forEach((project: any) => {
      if (!hasAnyText(project?.projectName, project?.year, project?.address)) return;
      projectRows.push({
        supplier_id: supplierId,
        designer_id: row.id,
        project_name: toText(project.projectName),
        year: toText(project.year),
        address: toText(project.address),
        area: toText(project.area),
        renovation_type: toText(project.renovationType),
        project_types: toTextArray(project.projectTypes),
        is_highlight: Boolean(project.projectHighlight),
      });
      projectSources.push(project);
    });
  });

  if (projectRows.length === 0) return;

  const insertProjects = await supabaseAdmin
    .from('designer_projects')
    .insert(projectRows)
    .select('id');
  ensureOk(insertProjects, 'Insert designer_projects');

  const inserted = insertProjects.data || [];
  const fileRows: any[] = [];
  inserted.forEach((row, index) => {
    const project = projectSources[index];
    const photos = toPathArray(project?.photos);
    photos.forEach((path) => {
      fileRows.push({
        supplier_id: supplierId,
        designer_project_id: row.id,
        file_type: 'photo',
        path,
      });
    });
  });

  if (fileRows.length > 0) {
    const insertFiles = await supabaseAdmin
      .from('designer_project_files')
      .insert(fileRows);
    ensureOk(insertFiles, 'Insert designer_project_files');
  }
};

const saveCertifications = async (
  supplierId: string,
  scope: string,
  isoCodes: unknown,
  isoUploads: unknown,
  otherCerts: unknown
) => {
  const rows: any[] = [];
  const isoList = toTextArray(isoCodes);
  const uploads =
    isoUploads && typeof isoUploads === 'object'
      ? (isoUploads as Record<string, unknown>)
      : {};
  isoList.forEach((iso) => {
    rows.push({
      supplier_id: supplierId,
      scope,
      cert_type: 'iso',
      iso_code: iso,
      name: null,
      file_path: toPath(uploads[iso]),
    });
  });

  if (Array.isArray(otherCerts)) {
    otherCerts.forEach((cert) => {
      const name = toText(typeof cert === 'string' ? cert : cert?.name);
      if (!name) return;
      rows.push({
        supplier_id: supplierId,
        scope,
        cert_type: 'other',
        iso_code: null,
        name,
        file_path: toPath(typeof cert === 'object' ? cert?.file : null),
      });
    });
  }

  await replaceRows('supplier_certifications', { supplier_id: supplierId, scope }, rows);
};

const saveInsurances = async (
  supplierId: string,
  scope: string,
  insurances: unknown
) => {
  const rows = (Array.isArray(insurances) ? insurances : [])
    .filter((insurance) =>
      hasAnyText(insurance?.type, insurance?.provider, insurance?.expiryDate)
    )
    .map((insurance) => ({
      supplier_id: supplierId,
      scope,
      insurance_type: toText(insurance.type),
      provider: toText(insurance.provider),
      expiry_date: toText(insurance.expiryDate),
      file_path: toPath(insurance.file),
    }));

  await replaceRows('supplier_insurances', { supplier_id: supplierId, scope }, rows);
};

const saveMaterialLists = async (supplierId: string, data: any) => {
  const companyTypes = toTextArray(data.companyType).map((type) => ({
    supplier_id: supplierId,
    company_type: type,
  }));
  await replaceRows('material_company_types', { supplier_id: supplierId }, companyTypes);

  const representedBrands = toTextArray(data.representedBrands).map((brand) => ({
    supplier_id: supplierId,
    brand_name: brand,
  }));
  await replaceRows('material_represented_brands', { supplier_id: supplierId }, representedBrands);

  const warehouses = (Array.isArray(data.warehouses) ? data.warehouses : []) as Array<{
    address?: unknown;
    capacity?: unknown;
  }>;
  const warehouseRows = warehouses
    .filter((warehouse) => hasAnyText(warehouse?.address, warehouse?.capacity))
    .map((warehouse) => ({
      supplier_id: supplierId,
      address: toText(warehouse.address),
      capacity: toText(warehouse.capacity),
    }));
  await replaceRows('material_warehouses', { supplier_id: supplierId }, warehouseRows);
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
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const payload = body.data && typeof body.data === 'object' ? body.data : body;
    const supplierType: SupplierType | null =
      body.supplierType || payload.supplierType || null;
    const status: SupplierStatus =
      body.status === 'submitted' ? 'submitted' : 'draft';

    if (!supplierType || !SUPPLIER_TYPES.has(supplierType)) {
      return NextResponse.json({ error: 'Invalid supplier type' }, { status: 400 });
    }

    const companyLinkCheck = validateOptionalUrl(
      payload.companySupplementLink,
      'Company website / 公司網站'
    );
    if (!companyLinkCheck.ok) {
      return NextResponse.json({ error: companyLinkCheck.error }, { status: 400 });
    }

    if (Array.isArray(payload.products)) {
      for (const product of payload.products) {
        const specCheck = validateOptionalUrl(
          product?.specificationLink,
          'Product specification link / 產品規格連結'
        );
        if (!specCheck.ok) {
          return NextResponse.json({ error: specCheck.error }, { status: 400 });
        }
      }
    }

    const auth = await requireUser(request);
    if ('error' in auth) return auth.error;
    const userId = auth.user.id;

    const existing = await supabaseAdmin
      .from('suppliers')
      .select('id, submitted_at')
      .eq('user_id', userId)
      .eq('supplier_type', supplierType)
      .maybeSingle();
    ensureOk(existing, 'Select suppliers');

    const submittedAt =
      status === 'submitted'
        ? new Date().toISOString()
        : existing.data?.submitted_at ?? null;

    const resolvedBusinessType =
      toText(payload.businessType) || BUSINESS_TYPE_LABELS[supplierType];

    let supplierId = existing.data?.id;
    if (!supplierId) {
      const insertSupplier = await supabaseAdmin
        .from('suppliers')
        .insert({
          user_id: userId,
          supplier_type: supplierType,
          status,
          submitted_at: submittedAt,
        })
        .select('id')
        .single();
      ensureOk(insertSupplier, 'Insert suppliers');
      if (!insertSupplier.data?.id) {
        throw new Error('Insert suppliers: missing id');
      }
      supplierId = insertSupplier.data.id;
    } else {
      const updateSupplier = await supabaseAdmin
        .from('suppliers')
        .update({
          supplier_type: supplierType,
          status,
          submitted_at: submittedAt,
        })
        .eq('id', supplierId);
      ensureOk(updateSupplier, 'Update suppliers');
    }

    const companyRow = {
      supplier_id: supplierId,
      company_name_en: toText(payload.companyName),
      company_name_zh: toText(payload.companyNameChinese),
      year_established: toText(payload.yearEstablished),
      registered_capital: toText(payload.registeredCapital),
      country: toText(payload.country),
      office_address: toText(payload.officeAddress),
      hk_work_eligible_employees: toText(payload.hkWorkEligibleEmployees),
      business_type: resolvedBusinessType,
      business_description: toText(payload.businessDescription),
      company_supplement_link: toText(payload.companySupplementLink),
      company_logo_path: toPath(payload.companyLogo),
    };
    ensureOk(
      await supabaseAdmin.from('supplier_company').upsert(companyRow),
      'Upsert supplier_company'
    );

    const registrationRow = {
      supplier_id: supplierId,
      hk_business_registration_number: toText(payload.hkBusinessRegistrationNumber),
      cn_business_registration_number: toText(payload.cnBusinessRegistrationNumber),
      cn_unified_social_credit_code: toText(payload.cnUnifiedSocialCreditCode),
    };
    ensureOk(
      await supabaseAdmin.from('supplier_registration').upsert(registrationRow),
      'Upsert supplier_registration'
    );

    const contactRow = {
      supplier_id: supplierId,
      contact_name: toText(payload.submitterName),
      contact_position: toText(payload.submitterPosition),
      contact_phone_code: toText(payload.submitterPhoneCode),
      contact_phone: toText(payload.submitterPhone),
      contact_email: toText(payload.submitterEmail),
      contact_fax: toText(payload.contactFax),
      submission_date: toText(payload.submissionDate),
    };
    ensureOk(
      await supabaseAdmin.from('supplier_contact').upsert(contactRow),
      'Upsert supplier_contact'
    );

    if (
      payload.guaranteeInfoTrue !== undefined ||
      payload.acceptQualitySupervision !== undefined ||
      payload.agreeInfoSharing !== undefined
    ) {
      const commitmentsRow = {
        supplier_id: supplierId,
        guarantee_info_true: Boolean(payload.guaranteeInfoTrue),
        accept_quality_supervision: Boolean(payload.acceptQualitySupervision),
        agree_info_sharing: Boolean(payload.agreeInfoSharing),
      };
      ensureOk(
        await supabaseAdmin.from('supplier_commitments').upsert(commitmentsRow),
        'Upsert supplier_commitments'
      );
    }

    if (supplierType === 'contractor') {
      const contractorProfile = {
        supplier_id: supplierId,
        number_of_employees: toText(payload.numberOfEmployees),
        construction_grade: toText(payload.constructionGrade),
        license_number: toText(payload.licenseNumber),
        annual_construction_capacity: toText(payload.annualConstructionCapacity),
        max_concurrent_projects: toText(payload.maxConcurrentProjects),
        largest_project_value: toText(payload.largestProjectValue),
        has_safety_officer: toBoolean(payload.hasSafetyOfficer),
        safety_officer_count: toInt(payload.numberOfSafetyOfficers),
        has_construction_manager: toBoolean(payload.hasConstructionManager),
        construction_manager_count: toInt(payload.numberOfConstructionManagers),
        has_mep_lead: toBoolean(payload.hasMepLead),
        mep_lead_count: toInt(payload.numberOfMepLeads),
        cn_hk_project_compliance: Boolean(payload.cnHkProjectCompliance),
        has_environmental_health_safety: toBoolean(payload.hasEnvironmentalHealthSafety),
        has_incidents_past_3_years: toBoolean(payload.hasIncidentsPast3Years),
        has_litigation_past_3_years: toBoolean(payload.hasLitigationPast3Years),
      };
      ensureOk(
        await supabaseAdmin.from('contractor_profile').upsert(contractorProfile),
        'Upsert contractor_profile'
      );

      const projectTypes = toTextArray(payload.projectTypes).map((projectType) => ({
        supplier_id: supplierId,
        scope: 'contractor',
        project_type: projectType,
      }));
      await replaceRows(
        'supplier_project_types',
        { supplier_id: supplierId, scope: 'contractor' },
        projectTypes
      );

      await saveProjectHighlights(supplierId, 'contractor', payload.projectHighlights);
      await saveProjectManagers(supplierId, 'contractor', payload.projectManagers);
      await saveCertifications(
        supplierId,
        'contractor',
        payload.isocertifications,
        payload.isoCertificateUploads,
        payload.otherCertifications
      );
      await saveInsurances(supplierId, 'contractor', payload.insurances);
      await saveDocumentType(supplierId, 'contractor', 'business_registration', payload.businessRegistration);
      await saveDocumentType(supplierId, 'contractor', 'company_photos', payload.companyPhotos);
      await saveDocumentType(supplierId, 'contractor', 'company_brochure', payload.companySupplementFile);
      await saveDocumentType(supplierId, 'contractor', 'organization_chart', payload.organizationChart);
      await saveDocumentType(supplierId, 'contractor', 'certificate_upload', payload.certificateUpload);
      await saveDocumentType(
        supplierId,
        'contractor',
        'environmental_health_safety',
        payload.environmentalHealthSafetyFile
      );
      await saveDocumentType(supplierId, 'contractor', 'incident_report', payload.incidentsFile);
      await saveDocumentType(supplierId, 'contractor', 'litigation_report', payload.litigationFile);
    }

    if (supplierType === 'designer') {
      const designerProfile = {
        supplier_id: supplierId,
        design_team_size: toText(payload.designTeamSize),
        bim_capability: toBoolean(payload.bimCapability),
        can_do_design_build: toBoolean(payload.canDoDesignBuild),
      };
      ensureOk(
        await supabaseAdmin.from('designer_profile').upsert(designerProfile),
        'Upsert designer_profile'
      );

      const awards = toTextArray(payload.designAwards).map((award) => ({
        supplier_id: supplierId,
        award,
      }));
      await replaceRows('designer_awards', { supplier_id: supplierId }, awards);

      const feeStructures = toTextArray(payload.feeStructure).map((feeType) => ({
        supplier_id: supplierId,
        fee_type: feeType,
      }));
      await replaceRows(
        'designer_fee_structures',
        { supplier_id: supplierId },
        feeStructures
      );

      const styles = toTextArray(payload.designStyles).map((style) => ({
        supplier_id: supplierId,
        style,
      }));
      await replaceRows('designer_styles', { supplier_id: supplierId }, styles);

      const software = toTextArray(payload.mainSoftware).map((item) => ({
        supplier_id: supplierId,
        software: item,
      }));
      await replaceRows('designer_software', { supplier_id: supplierId }, software);

      const projectTypes = toTextArray(payload.projectTypes).map((projectType) => ({
        supplier_id: supplierId,
        scope: 'designer',
        project_type: projectType,
      }));
      await replaceRows(
        'supplier_project_types',
        { supplier_id: supplierId, scope: 'designer' },
        projectTypes
      );

      await saveProjectHighlights(supplierId, 'designer', payload.designHighlights);
      await saveDesigners(supplierId, payload.designers);
      await saveDocumentType(supplierId, 'designer', 'business_registration', payload.businessRegistration);
      await saveDocumentType(supplierId, 'designer', 'company_photos', payload.companyPhotos);
      await saveDocumentType(supplierId, 'designer', 'company_brochure', payload.companySupplementFile);
      await saveDocumentType(supplierId, 'designer', 'organization_chart', payload.organizationChart);

      const designerDbProfile = {
        supplier_id: supplierId,
        construction_grade: toText(payload.dbConstructionGrade),
        license_number: toText(payload.dbLicenseNumber),
        annual_construction_capacity: toText(payload.dbAnnualConstructionCapacity),
        max_concurrent_projects: toText(payload.dbMaxConcurrentProjects),
        largest_project_value: toText(payload.dbLargestProjectValue),
        has_safety_officer: toBoolean(payload.dbHasSafetyOfficer),
        safety_officer_count: toInt(payload.dbNumberOfSafetyOfficers),
        has_construction_manager: toBoolean(payload.dbHasConstructionManager),
        construction_manager_count: toInt(payload.dbNumberOfConstructionManagers),
        has_mep_lead: toBoolean(payload.dbHasMepLead),
        mep_lead_count: toInt(payload.dbNumberOfMepLeads),
        cn_hk_project_compliance: Boolean(payload.dbCnHkProjectCompliance),
        has_environmental_health_safety: toBoolean(payload.dbHasEnvironmentalHealthSafety),
        has_incidents_past_3_years: toBoolean(payload.dbHasIncidentsPast3Years),
        has_litigation_past_3_years: toBoolean(payload.dbHasLitigationPast3Years),
      };
      ensureOk(
        await supabaseAdmin.from('designer_db_profile').upsert(designerDbProfile),
        'Upsert designer_db_profile'
      );

      const dbProjectTypes = toTextArray(payload.dbProjectTypes).map((projectType) => ({
        supplier_id: supplierId,
        scope: 'designer_db',
        project_type: projectType,
      }));
      await replaceRows(
        'supplier_project_types',
        { supplier_id: supplierId, scope: 'designer_db' },
        dbProjectTypes
      );

      await saveProjectHighlights(supplierId, 'designer_db', payload.dbProjectHighlights);
      await saveProjectManagers(supplierId, 'designer_db', payload.dbProjectManagers);
      await saveCertifications(
        supplierId,
        'designer_db',
        payload.dbIsocertifications,
        payload.dbIsoCertificateUploads,
        payload.dbOtherCertifications
      );
      await saveInsurances(supplierId, 'designer_db', payload.dbInsurances);
      await saveDocumentType(
        supplierId,
        'designer_db',
        'certificate_upload',
        payload.dbCertificateUpload
      );
      await saveDocumentType(
        supplierId,
        'designer_db',
        'organization_chart',
        payload.dbOrganizationChart
      );
      await saveDocumentType(
        supplierId,
        'designer_db',
        'environmental_health_safety',
        payload.dbEnvironmentalHealthSafetyFile
      );
      await saveDocumentType(supplierId, 'designer_db', 'incident_report', payload.dbIncidentsFile);
      await saveDocumentType(supplierId, 'designer_db', 'litigation_report', payload.dbLitigationFile);
    }

    if (supplierType === 'material') {
      const materialProfile = {
        supplier_id: supplierId,
        sample_provided: toBoolean(payload.sampleProvided),
        sample_cost: toText(payload.sampleCost),
        sample_delivery_time: toText(payload.sampleDeliveryTime),
        free_shipping_to_hk: toBoolean(payload.freeShippingToHK),
      };
      ensureOk(
        await supabaseAdmin.from('material_profile').upsert(materialProfile),
        'Upsert material_profile'
      );

      await saveMaterialLists(supplierId, payload);
      await saveProducts(supplierId, payload.products);
      await saveProjectHighlights(supplierId, 'material', payload.projectHighlights);
      await saveDocumentType(supplierId, 'material', 'business_registration', payload.businessRegistration);
      await saveDocumentType(supplierId, 'material', 'company_photos', payload.companyPhotos);
      await saveDocumentType(supplierId, 'material', 'company_brochure', payload.companySupplementFile);
    }

    return NextResponse.json({ ok: true, supplierId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

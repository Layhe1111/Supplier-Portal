const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {};
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const localEnv = loadEnvFile(path.join(process.cwd(), '.env.local'));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

async function ensureOk(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result;
}

async function insertSingle(table, row, context) {
  const result = await supabase.from(table).insert(row).select('id').single();
  await ensureOk(result, context || `Insert ${table}`);
  return result.data;
}

async function insertMany(table, rows, context) {
  if (!rows || rows.length === 0) return [];
  const result = await supabase.from(table).insert(rows).select('id');
  await ensureOk(result, context || `Insert ${table}`);
  return result.data || [];
}

async function countRows(table, supplierId) {
  const result = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', supplierId);
  await ensureOk(result, `Count ${table}`);
  return result.count || 0;
}

async function seedCommon(supplierId, supplierType, label) {
  const submissionDate = todayDate();
  await ensureOk(
    await supabase.from('supplier_company').insert({
      supplier_id: supplierId,
      company_name_en: `Test ${label} Co.`,
      company_name_zh: null,
      year_established: '2015',
      registered_capital: '5M',
      country: 'HK',
      office_address: '1 Test Street, Central',
      hk_work_eligible_employees: '5',
      business_type: label,
      business_description: `Seeded ${supplierType} supplier`,
      company_supplement_link: 'https://example.com',
      company_logo_path: null,
    }),
    'Insert supplier_company'
  );

  await ensureOk(
    await supabase.from('supplier_registration').insert({
      supplier_id: supplierId,
      hk_business_registration_number: `HK-${Math.floor(Math.random() * 1000000)}`,
      cn_business_registration_number: `CN-${Math.floor(Math.random() * 1000000)}`,
      cn_unified_social_credit_code: `USCC-${Math.floor(Math.random() * 1000000)}`,
    }),
    'Insert supplier_registration'
  );

  await ensureOk(
    await supabase.from('supplier_contact').insert({
      supplier_id: supplierId,
      contact_name: 'Test Contact',
      contact_position: 'Manager',
      contact_phone_code: '+852',
      contact_phone: '91234567',
      contact_email: `seed-${supplierType}-${Math.floor(Math.random() * 10000)}@example.com`,
      contact_fax: '1234-5678',
      submission_date: submissionDate,
    }),
    'Insert supplier_contact'
  );

  await ensureOk(
    await supabase.from('supplier_commitments').insert({
      supplier_id: supplierId,
      guarantee_info_true: true,
      accept_quality_supervision: true,
      agree_info_sharing: true,
    }),
    'Insert supplier_commitments'
  );
}

async function seedDocuments(supplierId, scope, docs) {
  if (!docs || docs.length === 0) return;
  await ensureOk(
    await supabase.from('supplier_documents').insert(
      docs.map((doc) => ({
        supplier_id: supplierId,
        scope,
        doc_type: doc.doc_type,
        path: doc.path,
        file_name: doc.file_name || null,
        metadata: doc.metadata || null,
      }))
    ),
    `Insert supplier_documents (${scope})`
  );
}

async function seedContractor(userId) {
  const label = 'Contractor / 承包商';
  const supplier = await insertSingle(
    'suppliers',
    {
      user_id: userId,
      supplier_type: 'contractor',
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    },
    'Insert suppliers (contractor)'
  );

  const supplierId = supplier.id;
  await seedCommon(supplierId, 'contractor', label);

  await ensureOk(
    await supabase.from('contractor_profile').insert({
      supplier_id: supplierId,
      number_of_employees: '25',
      construction_grade: 'RGBC',
      license_number: 'LIC-12345',
      annual_construction_capacity: '20',
      max_concurrent_projects: '4',
      largest_project_value: '2000000',
      has_safety_officer: true,
      safety_officer_count: 2,
      has_construction_manager: true,
      construction_manager_count: 3,
      has_mep_lead: true,
      mep_lead_count: 1,
      cn_hk_project_compliance: true,
      has_environmental_health_safety: true,
      has_incidents_past_3_years: false,
      has_litigation_past_3_years: false,
    }),
    'Insert contractor_profile'
  );

  await insertMany('supplier_project_types', [
    { supplier_id: supplierId, scope: 'contractor', project_type: 'commercial' },
    { supplier_id: supplierId, scope: 'contractor', project_type: 'office' },
  ]);

  const highlights = await insertMany('project_highlights', [
    {
      supplier_id: supplierId,
      scope: 'contractor',
      project_name: 'Contractor Project A',
      year: '2022',
      address: 'Central',
      area: '1200',
      renovation_type: 'newFitout',
      project_types: ['commercial'],
      is_highlight: true,
    },
    {
      supplier_id: supplierId,
      scope: 'contractor',
      project_name: 'Contractor Project B',
      year: '2021',
      address: 'TST',
      area: '800',
      renovation_type: 'remodel',
      project_types: ['office'],
      is_highlight: false,
    },
  ]);

  await insertMany('project_files', highlights.map((row, index) => ({
    supplier_id: supplierId,
    project_id: row.id,
    file_type: 'photo',
    path: `seed/contractor/project-${index + 1}.jpg`,
  })));

  const managers = await insertMany('project_managers', [
    {
      supplier_id: supplierId,
      scope: 'contractor',
      name: 'Alex Chan',
      years_experience: '10',
      languages: 'EN,ZH',
      main_project: 'Office Tower',
      year: '2020',
      address: 'Wan Chai',
      area: '1500',
      cv_path: 'seed/contractor/pm-cv.pdf',
    },
  ]);

  await insertMany('project_manager_projects', [
    {
      supplier_id: supplierId,
      project_manager_id: managers[0].id,
      project_name: 'PM Project 1',
      client_name: 'Client A',
      year: '2019',
      building_name: 'Tower A',
      area: '900',
    },
    {
      supplier_id: supplierId,
      project_manager_id: managers[0].id,
      project_name: 'PM Project 2',
      client_name: 'Client B',
      year: '2021',
      building_name: 'Tower B',
      area: '1100',
    },
  ]);

  await insertMany('supplier_certifications', [
    {
      supplier_id: supplierId,
      scope: 'contractor',
      cert_type: 'iso',
      iso_code: '9001',
      name: null,
      file_path: 'seed/contractor/iso-9001.pdf',
    },
    {
      supplier_id: supplierId,
      scope: 'contractor',
      cert_type: 'other',
      iso_code: null,
      name: 'Safety Certificate',
      file_path: 'seed/contractor/safety.pdf',
    },
  ]);

  await insertMany('supplier_insurances', [
    {
      supplier_id: supplierId,
      scope: 'contractor',
      insurance_type: 'Liability',
      provider: 'Test Insurance',
      expiry_date: '2026-12-31',
      file_path: 'seed/contractor/insurance.pdf',
    },
  ]);

  await seedDocuments(supplierId, 'contractor', [
    { doc_type: 'business_registration', path: 'seed/contractor/business_registration.pdf' },
    { doc_type: 'company_photos', path: 'seed/contractor/company_photo.jpg' },
    { doc_type: 'company_brochure', path: 'seed/contractor/brochure-1.pdf', metadata: { index: 0 } },
    { doc_type: 'company_brochure', path: 'seed/contractor/brochure-2.pdf', metadata: { index: 1 } },
    { doc_type: 'organization_chart', path: 'seed/contractor/org-chart.pdf' },
    { doc_type: 'certificate_upload', path: 'seed/contractor/license.pdf' },
    { doc_type: 'environmental_health_safety', path: 'seed/contractor/ehs.pdf' },
    { doc_type: 'incident_report', path: 'seed/contractor/incidents.pdf' },
    { doc_type: 'litigation_report', path: 'seed/contractor/litigation.pdf' },
  ]);

  return supplierId;
}

async function seedDesigner(userId) {
  const label = 'Designer / 設計師';
  const supplier = await insertSingle(
    'suppliers',
    {
      user_id: userId,
      supplier_type: 'designer',
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    },
    'Insert suppliers (designer)'
  );

  const supplierId = supplier.id;
  await seedCommon(supplierId, 'designer', label);

  await ensureOk(
    await supabase.from('designer_profile').insert({
      supplier_id: supplierId,
      design_team_size: '12',
      bim_capability: true,
      can_do_design_build: true,
    }),
    'Insert designer_profile'
  );

  await ensureOk(
    await supabase.from('designer_db_profile').insert({
      supplier_id: supplierId,
      construction_grade: 'DB-Grade',
      license_number: 'DB-LIC-123',
      annual_construction_capacity: '15',
      max_concurrent_projects: '3',
      largest_project_value: '1500000',
      has_safety_officer: true,
      safety_officer_count: 1,
      has_construction_manager: true,
      construction_manager_count: 2,
      has_mep_lead: false,
      mep_lead_count: 0,
      cn_hk_project_compliance: true,
      has_environmental_health_safety: true,
      has_incidents_past_3_years: false,
      has_litigation_past_3_years: false,
    }),
    'Insert designer_db_profile'
  );

  await insertMany('designer_awards', [
    { supplier_id: supplierId, award: 'Best Design 2022' },
    { supplier_id: supplierId, award: 'Innovation Award 2023' },
  ]);

  await insertMany('designer_fee_structures', [
    { supplier_id: supplierId, fee_type: 'byArea' },
    { supplier_id: supplierId, fee_type: 'byProject' },
  ]);

  await insertMany('designer_styles', [
    { supplier_id: supplierId, style: 'modernMinimalist' },
    { supplier_id: supplierId, style: 'industrial' },
  ]);

  await insertMany('designer_software', [
    { supplier_id: supplierId, software: 'AutoCAD' },
    { supplier_id: supplierId, software: 'SketchUp' },
  ]);

  await insertMany('supplier_project_types', [
    { supplier_id: supplierId, scope: 'designer', project_type: 'residential' },
    { supplier_id: supplierId, scope: 'designer', project_type: 'commercial' },
    { supplier_id: supplierId, scope: 'designer_db', project_type: 'office' },
  ]);

  const designHighlights = await insertMany('project_highlights', [
    {
      supplier_id: supplierId,
      scope: 'designer',
      project_name: 'Design Highlight A',
      year: '2023',
      address: 'Central',
      area: '500',
      renovation_type: 'newFitout',
      project_types: ['residential'],
      is_highlight: true,
    },
  ]);

  await insertMany('project_files', designHighlights.map((row) => ({
    supplier_id: supplierId,
    project_id: row.id,
    file_type: 'photo',
    path: 'seed/designer/design-highlight.jpg',
  })));

  const dbHighlights = await insertMany('project_highlights', [
    {
      supplier_id: supplierId,
      scope: 'designer_db',
      project_name: 'DB Highlight A',
      year: '2022',
      address: 'Kwun Tong',
      area: '900',
      renovation_type: 'remodel',
      project_types: ['office'],
      is_highlight: false,
    },
  ]);

  await insertMany('project_files', dbHighlights.map((row) => ({
    supplier_id: supplierId,
    project_id: row.id,
    file_type: 'photo',
    path: 'seed/designer/db-highlight.jpg',
  })));

  const designers = await insertMany('designers', [
    {
      supplier_id: supplierId,
      name: 'Jamie Lee',
      experience: '8',
      cv_path: 'seed/designer/jamie-cv.pdf',
    },
    {
      supplier_id: supplierId,
      name: 'Taylor Ng',
      experience: '5',
      cv_path: 'seed/designer/taylor-cv.pdf',
    },
  ]);

  const designerProjects = await insertMany('designer_projects', [
    {
      supplier_id: supplierId,
      designer_id: designers[0].id,
      project_name: 'Designer Project 1',
      year: '2021',
      address: 'Admiralty',
      area: '600',
      renovation_type: 'newFitout',
      project_types: ['commercial'],
      is_highlight: true,
    },
    {
      supplier_id: supplierId,
      designer_id: designers[1].id,
      project_name: 'Designer Project 2',
      year: '2020',
      address: 'Causeway Bay',
      area: '450',
      renovation_type: 'remodel',
      project_types: ['residential'],
      is_highlight: false,
    },
  ]);

  await insertMany('designer_project_files', designerProjects.map((row, index) => ({
    supplier_id: supplierId,
    designer_project_id: row.id,
    file_type: 'photo',
    path: `seed/designer/project-${index + 1}.jpg`,
  })));

  const dbManagers = await insertMany('project_managers', [
    {
      supplier_id: supplierId,
      scope: 'designer_db',
      name: 'Morgan Ho',
      years_experience: '12',
      languages: 'EN,ZH',
      main_project: 'Mall Revamp',
      year: '2021',
      address: 'Shatin',
      area: '1200',
      cv_path: 'seed/designer/pm-cv.pdf',
    },
  ]);

  await insertMany('project_manager_projects', [
    {
      supplier_id: supplierId,
      project_manager_id: dbManagers[0].id,
      project_name: 'DB PM Project 1',
      client_name: 'Client C',
      year: '2020',
      building_name: 'Mall C',
      area: '800',
    },
  ]);

  await insertMany('supplier_certifications', [
    {
      supplier_id: supplierId,
      scope: 'designer_db',
      cert_type: 'iso',
      iso_code: '14001',
      name: null,
      file_path: 'seed/designer/iso-14001.pdf',
    },
    {
      supplier_id: supplierId,
      scope: 'designer_db',
      cert_type: 'other',
      iso_code: null,
      name: 'DB Safety Certificate',
      file_path: 'seed/designer/db-safety.pdf',
    },
  ]);

  await insertMany('supplier_insurances', [
    {
      supplier_id: supplierId,
      scope: 'designer_db',
      insurance_type: 'DB Liability',
      provider: 'Test Insurance',
      expiry_date: '2026-10-01',
      file_path: 'seed/designer/db-insurance.pdf',
    },
  ]);

  await seedDocuments(supplierId, 'designer', [
    { doc_type: 'business_registration', path: 'seed/designer/business_registration.pdf' },
    { doc_type: 'company_photos', path: 'seed/designer/company_photo.jpg' },
    { doc_type: 'company_brochure', path: 'seed/designer/brochure-1.pdf', metadata: { index: 0 } },
    { doc_type: 'organization_chart', path: 'seed/designer/org-chart.pdf' },
  ]);

  await seedDocuments(supplierId, 'designer_db', [
    { doc_type: 'certificate_upload', path: 'seed/designer/db-license.pdf' },
    { doc_type: 'organization_chart', path: 'seed/designer/db-org-chart.pdf' },
    { doc_type: 'environmental_health_safety', path: 'seed/designer/db-ehs.pdf' },
    { doc_type: 'incident_report', path: 'seed/designer/db-incidents.pdf' },
    { doc_type: 'litigation_report', path: 'seed/designer/db-litigation.pdf' },
  ]);

  return supplierId;
}

async function seedMaterial(userId) {
  const label = 'Material Supplier / 材料供應商';
  const supplier = await insertSingle(
    'suppliers',
    {
      user_id: userId,
      supplier_type: 'material',
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    },
    'Insert suppliers (material)'
  );

  const supplierId = supplier.id;
  await seedCommon(supplierId, 'material', label);

  await ensureOk(
    await supabase.from('material_profile').insert({
      supplier_id: supplierId,
      sample_provided: true,
      sample_cost: 'free',
      sample_delivery_time: '7 days',
      free_shipping_to_hk: true,
    }),
    'Insert material_profile'
  );

  await insertMany('material_company_types', [
    { supplier_id: supplierId, company_type: 'manufacturer' },
    { supplier_id: supplierId, company_type: 'agent' },
  ]);

  await insertMany('material_represented_brands', [
    { supplier_id: supplierId, brand_name: 'Brand A' },
    { supplier_id: supplierId, brand_name: 'Brand B' },
  ]);

  await insertMany('material_warehouses', [
    { supplier_id: supplierId, address: 'Warehouse 1', capacity: '500sqm' },
    { supplier_id: supplierId, address: 'Warehouse 2', capacity: '300sqm' },
  ]);

  const products = await insertMany('products', [
    {
      supplier_id: supplierId,
      sku: 'MAT-001',
      product_name: 'Acoustic Panel',
      category: 'Wall',
      brand: 'Brand A',
      series: 'Series X',
      spec: '600x600',
      material: 'Fiber',
      unit_price: 120,
      moq: 50,
      origin: 'CN',
      lead_time_days: 14,
      current_stock: 300,
      specification_link: 'https://example.com/spec',
    },
    {
      supplier_id: supplierId,
      sku: 'MAT-002',
      product_name: 'Floor Tile',
      category: 'Floor',
      brand: 'Brand B',
      series: 'Series Y',
      spec: '300x300',
      material: 'Ceramic',
      unit_price: 80,
      moq: 100,
      origin: 'CN',
      lead_time_days: 10,
      current_stock: 500,
      specification_link: 'https://example.com/spec-2',
    },
  ]);

  await insertMany('product_files', [
    {
      supplier_id: supplierId,
      product_id: products[0].id,
      file_type: 'photo',
      path: 'seed/material/product-1.jpg',
    },
    {
      supplier_id: supplierId,
      product_id: products[0].id,
      file_type: 'spec',
      path: 'seed/material/product-1-spec.pdf',
    },
    {
      supplier_id: supplierId,
      product_id: products[0].id,
      file_type: 'model3d',
      path: 'seed/material/product-1-model.glb',
    },
    {
      supplier_id: supplierId,
      product_id: products[1].id,
      file_type: 'photo',
      path: 'seed/material/product-2.jpg',
    },
  ]);

  const highlights = await insertMany('project_highlights', [
    {
      supplier_id: supplierId,
      scope: 'material',
      project_name: 'Material Project A',
      year: '2023',
      address: 'Kowloon',
      area: '700',
      renovation_type: 'newFitout',
      project_types: ['commercial'],
      is_highlight: true,
    },
  ]);

  await insertMany('project_files', highlights.map((row) => ({
    supplier_id: supplierId,
    project_id: row.id,
    file_type: 'photo',
    path: 'seed/material/project-photo.jpg',
  })));

  await seedDocuments(supplierId, 'material', [
    { doc_type: 'business_registration', path: 'seed/material/business_registration.pdf' },
    { doc_type: 'company_photos', path: 'seed/material/company_photo.jpg' },
    { doc_type: 'company_brochure', path: 'seed/material/brochure-1.pdf', metadata: { index: 0 } },
  ]);

  return supplierId;
}

async function seedBasic(userId) {
  const label = 'Basic Supplier / 基礎供應商';
  const supplier = await insertSingle(
    'suppliers',
    {
      user_id: userId,
      supplier_type: 'basic',
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    },
    'Insert suppliers (basic)'
  );

  const supplierId = supplier.id;
  await seedCommon(supplierId, 'basic', label);
  return supplierId;
}

async function reportCounts(supplierId, tables) {
  const counts = {};
  for (const table of tables) {
    counts[table] = await countRows(table, supplierId);
  }
  return counts;
}

async function main() {
  const email = `seed-${Date.now()}@example.com`;
  const password = `Seed!${Math.floor(Math.random() * 100000)}a`;

  const userResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  await ensureOk(userResult, 'Create user');

  const userId = userResult.data.user.id;

  console.log('Created user:', email);

  const basicId = await seedBasic(userId);
  const basicCounts = await reportCounts(basicId, [
    'supplier_company',
    'supplier_contact',
    'supplier_registration',
    'supplier_commitments',
  ]);
  console.log('basic', basicId, basicCounts);

  const contractorId = await seedContractor(userId);
  const contractorCounts = await reportCounts(contractorId, [
    'supplier_company',
    'supplier_contact',
    'supplier_registration',
    'supplier_commitments',
    'supplier_documents',
    'contractor_profile',
    'supplier_project_types',
    'project_highlights',
    'project_files',
    'project_managers',
    'project_manager_projects',
    'supplier_certifications',
    'supplier_insurances',
  ]);
  console.log('contractor', contractorId, contractorCounts);

  const designerId = await seedDesigner(userId);
  const designerCounts = await reportCounts(designerId, [
    'supplier_company',
    'supplier_contact',
    'supplier_registration',
    'supplier_commitments',
    'supplier_documents',
    'designer_profile',
    'designer_db_profile',
    'designer_awards',
    'designer_fee_structures',
    'designer_styles',
    'designer_software',
    'supplier_project_types',
    'project_highlights',
    'project_files',
    'designers',
    'designer_projects',
    'designer_project_files',
    'project_managers',
    'project_manager_projects',
    'supplier_certifications',
    'supplier_insurances',
  ]);
  console.log('designer', designerId, designerCounts);

  const materialId = await seedMaterial(userId);
  const materialCounts = await reportCounts(materialId, [
    'supplier_company',
    'supplier_contact',
    'supplier_registration',
    'supplier_commitments',
    'supplier_documents',
    'material_profile',
    'material_company_types',
    'material_represented_brands',
    'material_warehouses',
    'products',
    'product_files',
    'project_highlights',
    'project_files',
  ]);
  console.log('material', materialId, materialCounts);

  console.log('Done. Seed user credentials:', { email, password });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
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

const DATA_PATH = path.join(process.cwd(), 'supply_data', 'supplier_directory_template.xlsx');
const SHEET_NAME = 'Supplier Directory';

const COLS = {
  companyName: 'Company Name / 公司名稱',
  companyNameChinese: 'Company Name (Chinese) / 公司中文名',
  officeAddress: 'Office Address / 辦公地址',
  phoneCode: 'Phone Code / 電話區號',
  phone: 'Phone / 聯絡電話',
  fax: 'Fax / 傳真',
  email: 'Email / 電郵',
  website: 'Website / 網址',
  businessType: 'Business Type / 業務類型',
  businessDescription: 'Business Description / 業務簡介',
};

function toText(value) {
  if (value == null) return '';
  const text = String(value).trim();
  return text;
}

function normalizeName(name) {
  return toText(name).toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeKey(name) {
  return normalizeName(name);
}

function normalizePhoneCode(value) {
  const text = toText(value);
  if (!text) return '';
  const digits = text.replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+${digits.replace(/[^\d]/g, '')}`;
}

function joinUnique(values) {
  const unique = [];
  const seen = new Set();
  values.forEach((value) => {
    const trimmed = toText(value);
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(trimmed);
  });
  return unique.join(' | ');
}

function buildPhoneValue(code, phone) {
  const phoneText = toText(phone);
  if (!phoneText) return '';
  const normalizedCode = normalizePhoneCode(code);
  if (!normalizedCode) return phoneText;
  return `${normalizedCode} ${phoneText}`;
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureOk(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result;
}

async function queryWithRetry(makeRequest, context, retries = 6) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const result = await makeRequest();
      if (result.error) {
        if (attempt === retries) {
          throw new Error(`${context}: ${result.error.message}`);
        }
      } else {
        return result;
      }
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
    }
    await sleep(1000 * attempt);
  }
  throw new Error(`${context}: failed after retries`);
}

async function loadDirectoryEntries() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Missing input file: ${DATA_PATH}`);
  }

  const workbook = xlsx.readFile(DATA_PATH);
  const sheetName = workbook.SheetNames.includes(SHEET_NAME)
    ? SHEET_NAME
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });

  const grouped = new Map();
  let skipped = 0;
  let duplicates = 0;

  rows.forEach((row, index) => {
    const companyName = toText(row[COLS.companyName]);
    if (!companyName) {
      skipped += 1;
      return;
    }
    const normalized = normalizeKey(companyName);
    const entry = {
      rowIndex: index + 2,
      companyName,
      companyNameChinese: toText(row[COLS.companyNameChinese]),
      officeAddress: toText(row[COLS.officeAddress]),
      phone: buildPhoneValue(row[COLS.phoneCode], row[COLS.phone]),
      fax: toText(row[COLS.fax]),
      email: toText(row[COLS.email]),
      website: toText(row[COLS.website]),
      businessType: toText(row[COLS.businessType]),
      businessDescription: toText(row[COLS.businessDescription]),
    };

    if (grouped.has(normalized)) {
      duplicates += 1;
      const existing = grouped.get(normalized);
      existing.companyNameChinese.push(entry.companyNameChinese);
      existing.officeAddress.push(entry.officeAddress);
      existing.phone.push(entry.phone);
      existing.fax.push(entry.fax);
      existing.email.push(entry.email);
      existing.website.push(entry.website);
      existing.businessType.push(entry.businessType);
      existing.businessDescription.push(entry.businessDescription);
      return;
    }

    grouped.set(normalized, {
      companyName: entry.companyName,
      companyNameChinese: [entry.companyNameChinese],
      officeAddress: [entry.officeAddress],
      phone: [entry.phone],
      fax: [entry.fax],
      email: [entry.email],
      website: [entry.website],
      businessType: [entry.businessType],
      businessDescription: [entry.businessDescription],
    });
  });

  return {
    entries: Array.from(grouped.values()).map((entry) => ({
      companyName: entry.companyName,
      companyNameChinese: joinUnique(entry.companyNameChinese),
      officeAddress: joinUnique(entry.officeAddress),
      phoneCode: '',
      phone: joinUnique(entry.phone),
      fax: joinUnique(entry.fax),
      email: joinUnique(entry.email),
      website: joinUnique(entry.website),
      businessType: joinUnique(entry.businessType),
      businessDescription: joinUnique(entry.businessDescription),
    })),
    skipped,
    duplicates,
    total: rows.length,
  };
}

async function fetchExistingBasicSuppliers() {
  const suppliersResult = await supabase
    .from('suppliers')
    .select('id, created_at')
    .eq('supplier_type', 'basic');
  await ensureOk(suppliersResult, 'Fetch suppliers');

  const suppliers = suppliersResult.data || [];
  const supplierIds = suppliers.map((row) => row.id);

  if (supplierIds.length === 0) {
    return {
      suppliers,
      companyMap: new Map(),
      contactMap: new Map(),
    };
  }

  const chunkSize = 200;
  const companyMap = new Map();
  const contactMap = new Map();

  for (let i = 0; i < supplierIds.length; i += chunkSize) {
    const chunk = supplierIds.slice(i, i + chunkSize);
    const companyResult = await queryWithRetry(
      () =>
        supabase
          .from('supplier_company')
          .select(
            'supplier_id, company_name_en, company_name_zh, country, office_address, business_type, business_description, company_supplement_link, company_logo_path'
          )
          .in('supplier_id', chunk),
      'Fetch supplier_company'
    );
    const contactResult = await queryWithRetry(
      () =>
        supabase
          .from('supplier_contact')
          .select(
            'supplier_id, contact_name, contact_position, contact_phone_code, contact_phone, contact_email, contact_fax, submission_date'
          )
          .in('supplier_id', chunk),
      'Fetch supplier_contact'
    );

    (companyResult.data || []).forEach((row) => {
      companyMap.set(row.supplier_id, row);
    });

    (contactResult.data || []).forEach((row) => {
      contactMap.set(row.supplier_id, row);
    });
  }

  return { suppliers, companyMap, contactMap };
}

async function dedupeDatabaseByName(suppliers, companyMap) {
  const grouped = new Map();

  suppliers.forEach((supplier) => {
    const company = companyMap.get(supplier.id);
    const companyName = company?.company_name_en || '';
    const normalized = normalizeKey(companyName);
    if (!normalized) return;
    const list = grouped.get(normalized) || [];
    list.push({ supplier, company });
    grouped.set(normalized, list);
  });

  const toDelete = [];
  grouped.forEach((list) => {
    if (list.length <= 1) return;
    const sorted = list.slice().sort((a, b) => {
      const aTime = a.supplier.created_at ? Date.parse(a.supplier.created_at) : 0;
      const bTime = b.supplier.created_at ? Date.parse(b.supplier.created_at) : 0;
      return aTime - bTime;
    });
    const keep = sorted[0];
    sorted.slice(1).forEach((item) => {
      toDelete.push(item.supplier.id);
    });
    grouped.set(
      normalizeKey(keep.company?.company_name_en || ''),
      [keep]
    );
  });

  if (toDelete.length > 0) {
    const deleteResult = await supabase.from('suppliers').delete().in('id', toDelete);
    await ensureOk(deleteResult, 'Delete duplicate suppliers');
  }

  return toDelete;
}

function pickValue(newValue, existingValue) {
  return newValue || existingValue || '';
}

async function upsertExistingSupplier(supplierId, entry, companyMap, contactMap) {
  const existingCompany = companyMap.get(supplierId) || {};
  const existingContact = contactMap.get(supplierId) || {};

  const companyRow = {
    supplier_id: supplierId,
    company_name_en: pickValue(entry.companyName, existingCompany.company_name_en),
    company_name_zh: pickValue(entry.companyNameChinese, existingCompany.company_name_zh),
    country: pickValue('', existingCompany.country),
    office_address: pickValue(entry.officeAddress, existingCompany.office_address),
    business_type: pickValue(entry.businessType, existingCompany.business_type),
    business_description: pickValue(entry.businessDescription, existingCompany.business_description),
    company_supplement_link: pickValue(entry.website, existingCompany.company_supplement_link),
    company_logo_path: existingCompany.company_logo_path || null,
  };

  const contactRow = {
    supplier_id: supplierId,
    contact_name: pickValue('', existingContact.contact_name),
    contact_position: pickValue('', existingContact.contact_position),
    contact_phone_code: entry.phoneCode || null,
    contact_phone: pickValue(entry.phone, existingContact.contact_phone),
    contact_email: pickValue(entry.email, existingContact.contact_email),
    contact_fax: pickValue(entry.fax, existingContact.contact_fax),
    submission_date: pickValue('', existingContact.submission_date) || todayDate(),
  };

  await ensureOk(
    await supabase.from('supplier_company').upsert(companyRow),
    'Upsert supplier_company'
  );
  await ensureOk(
    await supabase.from('supplier_contact').upsert(contactRow),
    'Upsert supplier_contact'
  );
}

async function createImportUser() {
  const email = `directory-import-${Date.now()}@example.com`;
  const password = `Dir!${Math.floor(Math.random() * 100000)}a`;
  const userResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  await ensureOk(userResult, 'Create import user');
  return userResult.data.user.id;
}

async function insertNewSupplier(entry, userId) {
  const supplierResult = await supabase
    .from('suppliers')
    .insert({
      user_id: userId,
      supplier_type: 'basic',
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  await ensureOk(supplierResult, 'Insert suppliers');

  const supplierId = supplierResult.data.id;

  await ensureOk(
    await supabase.from('supplier_company').insert({
      supplier_id: supplierId,
      company_name_en: entry.companyName,
      company_name_zh: entry.companyNameChinese || null,
      country: '',
      office_address: entry.officeAddress || null,
      business_type: entry.businessType || 'Other Suppliers / 其他供应商',
      business_description: entry.businessDescription || null,
      company_supplement_link: entry.website || null,
      company_logo_path: null,
    }),
    'Insert supplier_company'
  );

  await ensureOk(
    await supabase.from('supplier_contact').insert({
      supplier_id: supplierId,
      contact_name: null,
      contact_position: null,
      contact_phone_code: entry.phoneCode || null,
      contact_phone: entry.phone || null,
      contact_email: entry.email || null,
      contact_fax: entry.fax || null,
      submission_date: todayDate(),
    }),
    'Insert supplier_contact'
  );

  return supplierId;
}

async function main() {
  const wipeAll = process.argv.includes('--wipe-all');
  const { entries, skipped, duplicates, total } = await loadDirectoryEntries();
  console.log(`Loaded ${total} rows, ${entries.length} unique, ${duplicates} duplicates, ${skipped} skipped.`);

  if (wipeAll) {
    console.log('Wiping all suppliers before import...');
    await ensureOk(await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000'), 'Delete suppliers');
  }

  const { suppliers, companyMap, contactMap } = await fetchExistingBasicSuppliers();
  const deletedIds = wipeAll ? [] : await dedupeDatabaseByName(suppliers, companyMap);

  if (deletedIds.length > 0) {
    console.log(`Deleted ${deletedIds.length} duplicate suppliers in database (basic).`);
  }

  if (deletedIds.length > 0) {
    const deletedSet = new Set(deletedIds);
    for (let i = suppliers.length - 1; i >= 0; i -= 1) {
      if (deletedSet.has(suppliers[i].id)) {
        suppliers.splice(i, 1);
      }
    }
    deletedSet.forEach((id) => {
      companyMap.delete(id);
      contactMap.delete(id);
    });
  }

  const existingNameToId = new Map();
  suppliers.forEach((supplier) => {
    const company = companyMap.get(supplier.id);
    const normalized = normalizeKey(company?.company_name_en || '');
    if (normalized) {
      existingNameToId.set(normalized, supplier.id);
    }
  });

  let updated = 0;
  let inserted = 0;
  let importUserId = null;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const normalized = normalizeKey(entry.companyName);
    const existingId = existingNameToId.get(normalized);
    if (existingId) {
      await upsertExistingSupplier(existingId, entry, companyMap, contactMap);
      updated += 1;
    } else {
      if (!importUserId) {
        importUserId = await createImportUser();
      }
      await insertNewSupplier(entry, importUserId);
      inserted += 1;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${entries.length} processed...`);
    }
  }

  console.log(`Done. Inserted: ${inserted}, updated: ${updated}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

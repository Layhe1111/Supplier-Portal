import * as XLSX from 'xlsx';
import type { Product } from '@/types/supplier';

export const PRODUCT_TEMPLATE_HEADERS = [
  'Category / 類別',
  'Brand / 品牌',
  'Series / 系列',
  'SKU / SKU編碼',
  'Product Name / 產品名稱',
  'Spec / 規格',
  'Material / 材質',
  'Unit Price (HKD) / 單價（港幣）',
  'MOQ / 最小起訂量',
  'Origin / 產地',
  'Lead Time (days) / 货期',
  'Current Stock / 現有庫存',
];

const REQUIRED_FIELDS: Array<keyof Product> = [
  'category',
  'brand',
  'productName',
  'spec',
  'unitPrice',
  'moq',
  'origin',
  'leadTime',
];

const REQUIRED_LABELS: Record<keyof Product, string> = {
  id: 'ID',
  sku: 'SKU',
  productName: '產品名稱',
  category: '產品類別',
  brand: '產品品牌',
  series: '產品系列',
  spec: '規格',
  material: '材質',
  unitPrice: '單價',
  moq: 'MOQ',
  origin: '產地',
  leadTime: '货期',
  currentStock: '現有庫存',
  photos: '產品照片',
  specificationFile: '產品規格書',
  specificationLink: '規格連結',
  model3D: '3D模型',
};

const HEADER_ALIASES: Record<string, keyof Product> = {
  category: 'category',
  productcategory: 'category',
  '產品類別': 'category',
  '類別': 'category',
  brand: 'brand',
  '產品品牌': 'brand',
  '品牌': 'brand',
  series: 'series',
  '產品系列': 'series',
  '系列': 'series',
  sku: 'sku',
  skucode: 'sku',
  'sku編碼': 'sku',
  productname: 'productName',
  name: 'productName',
  '產品名稱': 'productName',
  spec: 'spec',
  size: 'spec',
  '規格': 'spec',
  material: 'material',
  '材質': 'material',
  unitpricehkd: 'unitPrice',
  unitprice: 'unitPrice',
  price: 'unitPrice',
  '單價港幣': 'unitPrice',
  '價格': 'unitPrice',
  moq: 'moq',
  '最小起訂量': 'moq',
  origin: 'origin',
  '產地': 'origin',
  leadtime: 'leadTime',
  leadtimedays: 'leadTime',
  '货期': 'leadTime',
  '交期': 'leadTime',
  currentstock: 'currentStock',
  '現有庫存': 'currentStock',
  '庫存': 'currentStock',
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/[-_.]/g, '')
    .trim();

const resolveHeaderKey = (header: string) => {
  const parts = header.split(/[\/／]/).map((part) => normalizeHeader(part));
  for (const part of parts) {
    const hit = HEADER_ALIASES[part];
    if (hit) return hit;
  }
  const normalized = normalizeHeader(header);
  return HEADER_ALIASES[normalized];
};

const getCellText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
};

export type ProductImportResult = {
  products: Product[];
  errors: string[];
};

export const parseProductImportFile = async (
  file: File
): Promise<ProductImportResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { products: [], errors: ['未找到工作表'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][];

  if (rows.length === 0) {
    return { products: [], errors: ['表格为空'] };
  }

  const headerRow = rows[0].map((cell) => getCellText(cell));
  const columnMap: Record<number, keyof Product> = {};
  headerRow.forEach((header, index) => {
    const key = resolveHeaderKey(header);
    if (key) {
      columnMap[index] = key;
    }
  });

  if (Object.keys(columnMap).length === 0) {
    return { products: [], errors: ['未识别到表头，请使用模板'] };
  }

  const products: Product[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((row, rowIndex) => {
    const mapped: Partial<Record<keyof Product, string>> = {};
    Object.entries(columnMap).forEach(([columnIndex, key]) => {
      const value = row[Number(columnIndex)];
      mapped[key] = getCellText(value);
    });

    const hasAnyValue = Object.values(mapped).some((value) => value && value.trim());
    if (!hasAnyValue) return;

    const missing = REQUIRED_FIELDS.filter((field) => !mapped[field]);
    if (missing.length > 0) {
      const missingLabels = missing.map((field) => REQUIRED_LABELS[field]).join('、');
      errors.push(`第${rowIndex + 2}行：缺少${missingLabels}`);
      return;
    }

    products.push({
      id: `${Date.now()}-${rowIndex}`,
      sku: mapped.sku || '',
      productName: mapped.productName || '',
      category: mapped.category || '',
      brand: mapped.brand || '',
      series: mapped.series || '',
      spec: mapped.spec || '',
      material: mapped.material || '',
      unitPrice: mapped.unitPrice || '',
      moq: mapped.moq || '',
      origin: mapped.origin || '',
      leadTime: mapped.leadTime || '',
      currentStock: mapped.currentStock || '',
      photos: [],
      specificationFile: null,
      specificationLink: '',
      model3D: null,
    });
  });

  return { products, errors };
};

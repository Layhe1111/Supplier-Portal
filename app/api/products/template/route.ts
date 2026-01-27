import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { PRODUCT_TEMPLATE_HEADERS } from '@/lib/productImport';

export async function GET() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([PRODUCT_TEMPLATE_HEADERS]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="product-template.xlsx"',
    },
  });
}

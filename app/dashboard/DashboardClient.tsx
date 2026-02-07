'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SupplierFormData, Product } from '@/types/supplier';
import ProductModal from '@/components/ProductModal';
import { supabase } from '@/lib/supabaseClient';
import { validateOptionalUrl } from '@/lib/urlValidation';
import { parseProductImportFile } from '@/lib/productImport';
import { useToast } from '@/components/ToastProvider';

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'supplier-files';
const STORAGE_PATH_REGEX = /^[^/]+\/\d{13}-/;

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);

const isStoragePath = (value: string) => STORAGE_PATH_REGEX.test(value);

const collectStoragePaths = (value: unknown, paths: Set<string>) => {
  if (typeof value === 'string') {
    if (!isRemoteUrl(value) && isStoragePath(value)) {
      paths.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStoragePaths(item, paths));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) =>
      collectStoragePaths(item, paths)
    );
  }
};

const replaceStoragePaths = (value: unknown, map: Map<string, string>): unknown => {
  if (typeof value === 'string') {
    return map.get(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStoragePaths(item, map));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const next: Record<string, unknown> = {};
    entries.forEach(([key, item]) => {
      next[key] = replaceStoragePaths(item, map);
    });
    return next;
  }
  return value;
};

const formatPhone = (code?: string, number?: string) =>
  [code, number].filter(Boolean).join(' ').trim();

const COUNTRY_LABELS: Record<string, string> = {
  'Hong Kong': 'Hong Kong 香港',
  China: 'China 中國',
  Macau: 'Macau 澳門',
  Taiwan: 'Taiwan 台灣',
  Singapore: 'Singapore 新加坡',
  Malaysia: 'Malaysia 馬來西亞',
  Japan: 'Japan 日本',
  'South Korea': 'South Korea 韓國',
  Indonesia: 'Indonesia 印尼',
  India: 'India 印度',
  'United Arab Emirates': 'UAE 阿聯酋',
  'United Kingdom': 'United Kingdom 英國',
  'United States': 'United States 美國',
  Canada: 'Canada 加拿大',
  Australia: 'Australia 澳洲',
  Germany: 'Germany 德國',
  France: 'France 法國',
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  residential: 'Residential 住宅',
  commercial: 'Retail 零售',
  office: 'Office 辦公',
  hotel: 'Hotel 酒店',
  medical: 'Medical 醫療',
  education: 'Education 教育',
  industrial: 'Industrial 工業',
  other: 'Other 其他',
};

const COMPANY_TYPE_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer 生產商',
  agent: 'Agent 代理商',
  distributor: 'Distributor 經銷商',
};

const FEE_STRUCTURE_LABELS: Record<string, string> = {
  byArea: 'By Area 按面積',
  byProject: 'By Project 按項目',
  byPeriod: 'By Period 按時間',
  other: 'Other 其他',
};

const SOFTWARE_LABELS: Record<string, string> = {
  AutoCAD: 'AutoCAD',
  SketchUp: 'SketchUp',
  Revit: 'Revit',
  '3DMax': '3DMax',
};

const DESIGN_STYLE_LABELS: Record<string, string> = {
  modernMinimalist: '現代簡約風 / Modern Minimalist',
  nordic: '北歐風 / Nordic Style',
  newChinese: '新中式風 / New Chinese Style',
  lightLuxury: '輕奢風 / Light Luxury Style',
  japaneseLog: '日式原木風 / Japanese Log Style',
  industrial: '工業風 / Industrial Style',
  classic: '復古風 / Classic Style',
  french: '法式風 / French Style',
  hongKong: '港式風 / Hong Kong Style',
  modernLightLuxury: '現代輕奢風 / Modern Light Luxury Style',
  wabiSabi: '侘寂風 / Wabi-sabi Style',
  chineseFashion: '國潮風 / Chinese Fashion Style',
  minimalist: '極簡風 / Minimalist Style',
  lightLuxuryBusiness: '輕奢商務風 / Light Luxury Business Style',
  intelligentTech: '智能科技風 / Intelligent Technology Style',
  southeastAsian: '東南亞風 / Southeast Asian Style',
  frenchRetro: '法式復古風 / French Retro Style',
  healingLog: '療癒系原木風 / Healing Log Style',
  minimalistMedical: '極簡醫療風 / Minimalist Medical Style',
  childlikeNature: '童趣自然風 / Childlike Nature Style',
  originalIndustrial: '工業風 / Original Industrial Style',
  technology: '科技風 / Technology Style',
};

const DESIGN_STYLE_BY_PROJECT: Record<string, { value: string; label: string }[]> = {
  residential: [
    { value: 'modernMinimalist', label: '現代簡約風 / Modern Minimalist' },
    { value: 'nordic', label: '北歐風 / Nordic Style' },
    { value: 'newChinese', label: '新中式風 / New Chinese Style' },
    { value: 'lightLuxury', label: '輕奢風 / Light Luxury Style' },
    { value: 'japaneseLog', label: '日式原木風 / Japanese Log Style' },
    { value: 'industrial', label: '工業風 / Industrial Style' },
    { value: 'classic', label: '復古風 / Classic Style' },
    { value: 'french', label: '法式風 / French Style' },
    { value: 'hongKong', label: '港式風 / Hong Kong Style' },
  ],
  commercial: [
    { value: 'modernLightLuxury', label: '現代輕奢風 / Modern Light Luxury Style' },
    { value: 'industrial', label: '工業風 / Industrial Style' },
    { value: 'wabiSabi', label: '侘寂風 / Wabi-sabi Style' },
    { value: 'chineseFashion', label: '國潮風 / Chinese Fashion Style' },
    { value: 'minimalist', label: '極簡風 / Minimalist Style' },
  ],
  office: [
    { value: 'modernMinimalist', label: '現代簡約風 / Modern Minimalist' },
    { value: 'industrial', label: '工業風 / Industrial Style' },
    { value: 'newChinese', label: '新中式風 / New Chinese Style' },
    { value: 'lightLuxuryBusiness', label: '輕奢商務風 / Light Luxury Business Style' },
    { value: 'nordic', label: '北歐風 / Nordic Style' },
    { value: 'intelligentTech', label: '智能科技風 / Intelligent Technology Style' },
  ],
  hotel: [
    { value: 'modernLightLuxury', label: '現代輕奢風 / Modern Light Luxury Style' },
    { value: 'newChinese', label: '新中式風 / New Chinese Style' },
    { value: 'wabiSabi', label: '侘寂風 / Wabi-sabi Style' },
    { value: 'southeastAsian', label: '東南亞風 / Southeast Asian Style' },
    { value: 'industrial', label: '工業風 / Industrial Style' },
    { value: 'frenchRetro', label: '法式復古風 / French Retro Style' },
  ],
  medical: [
    { value: 'modernMinimalist', label: '現代簡約風 / Modern Minimalist' },
    { value: 'healingLog', label: '療癒系原木風 / Healing Log Style' },
    { value: 'minimalistMedical', label: '極簡醫療風 / Minimalist Medical Style' },
    { value: 'lightLuxury', label: '輕奢風 / Light Luxury Style' },
  ],
  education: [
    { value: 'childlikeNature', label: '童趣自然風 / Childlike Nature Style' },
    { value: 'modernMinimalist', label: '現代簡約風 / Modern Minimalist' },
    { value: 'newChinese', label: '新中式風 / New Chinese Style' },
    { value: 'nordic', label: '北歐風 / Nordic Style' },
  ],
  industrial: [
    { value: 'originalIndustrial', label: '工業風 / Original Industrial Style' },
    { value: 'modernMinimalist', label: '現代極簡風 / Modern Minimalist' },
    { value: 'technology', label: '科技風 / Technology Style' },
  ],
  other: [],
};
const INSURANCE_TYPE_LABELS: Record<string, string> = {
  "Contractors' All Risks": "Contractors' All Risks 建築工程保險",
  'General Liability insurance': 'General Liability insurance 第三者責任保險',
  'Worker Compensation': 'Worker Compensation 僱員補償保險',
};

const ISO_LABELS: Record<string, string> = {
  '9001': 'ISO 9001',
  '14001': 'ISO 14001',
  '45001': 'ISO 45001',
};

const RENOVATION_LABELS: Record<string, string> = {
  newFitout: 'New Fitout 全新装修',
  remodel: 'Remodel 改造翻新',
};

const SAMPLE_COST_LABELS: Record<string, string> = {
  free: 'Free 免費',
  charged: 'Charged 收費',
};

const YES_NO_HAVE = { yes: 'Yes 有', no: 'No 無' };
const YES_NO_IS = { yes: 'Yes 是', no: 'No 否' };
const YES_NO_EN = { yes: 'Yes', no: 'No' };

const mapSelectValue = (value: string, labels: Record<string, string>) =>
  labels[value] ?? value;

const mapSelectArray = (values: unknown, labels: Record<string, string>) => {
  if (!Array.isArray(values)) return [];
  return values.map((value) =>
    typeof value === 'string' ? mapSelectValue(value, labels) : value
  );
};

const mapYesNoValue = (
  value: unknown,
  labels: { yes: string; no: string }
): string | unknown => {
  if (value === true || value === 'yes') return labels.yes;
  if (value === false || value === 'no') return labels.no;
  return value;
};

const mapProjectTypes = (types: unknown) => {
  if (!Array.isArray(types)) return [];
  const output: string[] = [];
  types.forEach((type) => {
    if (typeof type !== 'string') return;
    if (type.startsWith('custom_')) {
      output.push(type.slice(7));
      return;
    }
    output.push(mapSelectValue(type, PROJECT_TYPE_LABELS));
  });
  return output;
};

const mapDesignStyles = (styles: unknown, projectTypes?: unknown) => {
  if (!Array.isArray(styles)) return [];
  const projectTypeList = Array.isArray(projectTypes)
    ? projectTypes.filter((type): type is string => typeof type === 'string')
    : [];
  return styles.map((style) => {
    if (typeof style !== 'string') return style;
    if (style.startsWith('custom_')) return style.slice(7);
    for (const type of projectTypeList) {
      const candidates = DESIGN_STYLE_BY_PROJECT[type];
      if (!candidates) continue;
      const matched = candidates.find((item) => item.value === style);
      if (matched) return matched.label;
    }
    return mapSelectValue(style, DESIGN_STYLE_LABELS);
  });
};

const mapAwards = (entries: unknown) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => {
      if (typeof entry !== 'string') return null;
      if (!entry.trim()) return null;
      try {
        const parsed = JSON.parse(entry);
        return {
          'Year / 年份': typeof parsed?.year === 'string' ? parsed.year : '',
          'Award / 獎項': typeof parsed?.award === 'string' ? parsed.award : '',
          'Placement / 名次': typeof parsed?.placement === 'string' ? parsed.placement : '',
          'Project / 項目': typeof parsed?.project === 'string' ? parsed.project : '',
        };
      } catch {
        return {
          'Year / 年份': '',
          'Award / 獎項': entry,
          'Placement / 名次': '',
          'Project / 項目': '',
        };
      }
    })
    .filter(Boolean);
};

const mapIsoUploads = (uploads: unknown) => {
  if (!uploads || typeof uploads !== 'object') return {};
  const next: Record<string, unknown> = {};
  Object.entries(uploads as Record<string, unknown>).forEach(([key, value]) => {
    const label = ISO_LABELS[key]
      ? `${ISO_LABELS[key]} Certificate Upload / 證書上傳`
      : key;
    next[label] = value;
  });
  return next;
};

const mapProjectHighlight = (item: any) => ({
  'Project Name / 項目名稱': item?.projectName ?? '',
  'Year / 年份': item?.year ?? '',
  'Area (sqft) / 面積（平方呎）': item?.area ?? '',
  'Building Name / 大廈名稱': item?.address ?? '',
  'Project Scope / 是否重新裝修？': mapSelectValue(
    item?.renovationType ?? '',
    RENOVATION_LABELS
  ),
  'Property Types / 主要項目類型': mapProjectTypes(item?.projectTypes),
  'Project Photos / 項目照片': item?.photos ?? [],
});

const mapManagerProject = (item: any) => ({
  'Project Name / 項目名稱': item?.projectName ?? '',
  'Client Name / 客戶名稱': item?.clientName ?? '',
  'Year / 年份': item?.year ?? '',
  'Building Name / 大廈名稱': item?.buildingName ?? '',
  'Area (sqft) / 面積（平方呎）': item?.area ?? '',
});

const mapProjectManager = (item: any) => ({
  'Name / 姓名': item?.name ?? '',
  'Year of Experience / 年資': item?.yearsExperience ?? '',
  'Languages / 語言': item?.languages ?? '',
  'Projects / 項目經歷': (item?.projects || []).map(mapManagerProject),
  'Project Manager CV / 項目經理簡歷': item?.cv ?? null,
});

const mapInsurance = (item: any) => ({
  'Insurance Type / 保險類型': mapSelectValue(item?.type ?? '', INSURANCE_TYPE_LABELS),
  'Insurance Provider / 保險公司': item?.provider ?? '',
  'Expiry Date / 到期日期': item?.expiryDate ?? '',
  'Insurance Certificate / 保險證明': item?.file ?? null,
});

const mapCertificationItem = (item: any) => ({
  'Certification Name / 認證名稱': item?.name ?? '',
  'Certificate Upload / 證書上傳': item?.file ?? null,
});

const mapDesignerProject = (item: any) => ({
  'Project Name / 項目名稱': item?.projectName ?? '',
  'Year / 年份': item?.year ?? '',
  'Area (sqft) / 面積（平方呎）': item?.area ?? '',
  'Building Name / 大廈名稱': item?.address ?? '',
  'Project Scope / 是否重新裝修？': mapSelectValue(
    item?.renovationType ?? '',
    RENOVATION_LABELS
  ),
  'Property Types / 主要項目類型': mapProjectTypes(item?.projectTypes),
  'Project Photos / 項目照片': item?.photos ?? [],
});

const mapDesigner = (item: any) => ({
  'Designer Name / 設計師姓名': item?.name ?? '',
  'Years of Experience / 年資': item?.experience ?? '',
  'Languages / 語言能力': item?.languages ?? '',
  'CV / 簡歷': item?.cv ?? null,
  'Projects / 項目經歷': (item?.projects || []).map(mapDesignerProject),
});

const mapWarehouse = (item: any) => ({
  'Warehouse Address / 倉庫地址': item?.address ?? '',
  'Storage Capacity (sqft) / 庫存容量（平方呎）': item?.capacity ?? '',
});

const mapProduct = (item: any) => ({
  'Product Category / 產品類別': item?.category ?? '',
  'Product Brand / 產品品牌': item?.brand ?? '',
  'Product Series / 產品系列': item?.series ?? '',
  'SKU / SKU編碼': item?.sku ?? '',
  'Product Name / 產品名稱': item?.productName ?? '',
  'size / 規格': item?.spec ?? '',
  'Material / 材質': item?.material ?? '',
  'Unit Price (HKD) / 單價（港幣）': item?.unitPrice ?? '',
  'MOQ / 最小起訂量': item?.moq ?? '',
  'Origin / 產地': mapSelectValue(item?.origin ?? '', COUNTRY_LABELS),
  'Lead Time (days) / 货期': item?.leadTime ?? '',
  'Current Stock / 現有庫存': item?.currentStock ?? '',
  'Product Photos / 產品照片': item?.photos ?? [],
  'Product Specification / 產品規格書': {
    'Upload PDF / 上傳PDF文件': item?.specificationFile ?? null,
    'Or enter link / 或輸入連結': item?.specificationLink ?? '',
  },
  '3D Model / 3D模型': item?.model3D ?? null,
});

const isEmptyValue = (value: unknown): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
};

const pruneEmpty = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const next = value
      .map((item) => pruneEmpty(item))
      .filter((item) => !isEmptyValue(item));
    return next.length > 0 ? next : undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const next: Record<string, unknown> = {};
    entries.forEach(([key, item]) => {
      const pruned = pruneEmpty(item);
      if (!isEmptyValue(pruned)) {
        next[key] = pruned;
      }
    });
    return Object.keys(next).length > 0 ? next : undefined;
  }
  return value;
};

const buildBilingualPayload = (supplier: any, status: string | null) => {
  if (supplier?.supplierType === 'contractor') {
    return {
      'Section 1: Company Profile / 公司基本信息': {
        'Company English Name / 公司英文名': supplier.companyName ?? '',
        'Company Chinese Name / 公司中文名': supplier.companyNameChinese ?? '',
        'Year of Incorporation / 成立年份': supplier.yearEstablished ?? '',
        'Registered Capital Amount / 註冊資本數額': supplier.registeredCapital ?? '',
        'Number of Employees / 員工人數': supplier.numberOfEmployees ?? '',
        'Country / 國家和地區': mapSelectValue(supplier.country ?? '', COUNTRY_LABELS),
        'Business Registration Number / 商業登記號': supplier.hkBusinessRegistrationNumber ?? '',
        'Business Registration Number / 工商註冊號': supplier.cnBusinessRegistrationNumber ?? '',
        'Unified Social Credit Code / 統一社會信用代碼':
          supplier.cnUnifiedSocialCreditCode ?? '',
        'Employees eligible to work legally in Hong Kong / 可以在香港合法工作的僱員數':
          supplier.hkWorkEligibleEmployees ?? '',
        'Office Address / 辦公地址': supplier.officeAddress ?? '',
        'Business Description / 公司或業務簡介': supplier.businessDescription ?? '',
        'Business Registration / 商業登記證': supplier.businessRegistration ?? null,
        'Company Photos / 公司形象照片': supplier.companyPhotos ?? null,
        'Upload Files / 上傳文件': supplier.companySupplementFile ?? null,
        'Or enter company website / 或輸入公司網站': supplier.companySupplementLink ?? '',
      },
      'Section 2: Certifications / 資質與認證': {
        'Do you have RGBC certificate / 是否有RGBC牌': mapYesNoValue(
          supplier.constructionGrade === 'RGBC',
          YES_NO_EN
        ),
        'Certificate Number / 資質證書編號': supplier.licenseNumber ?? '',
        'Certificate Upload / 資質證書上傳': supplier.certificateUpload ?? null,
        'ISO Certification / ISO認證': mapSelectArray(supplier.isocertifications, ISO_LABELS),
        ...mapIsoUploads(supplier.isoCertificateUploads),
        'Other Certifications / 其他認證': (supplier.otherCertifications || []).map(
          mapCertificationItem
        ),
      },
      'Section 3: Construction Capability / 施工能力': {
        'Property Types / 主要項目類型': mapProjectTypes(supplier.projectTypes),
        'Project Highlights / 亮點項目': (supplier.projectHighlights || []).map(
          mapProjectHighlight
        ),
        'Accumulated Project Area per Year (sqft) / 年施工面積（平方呎）':
          supplier.annualConstructionCapacity ?? '',
        'Maximum Number of Projects in Parallel / 最多能同時承接的項目數':
          supplier.maxConcurrentProjects ?? '',
        'Average Project Value (HKD) / 平均項目金額（港幣）':
          supplier.largestProjectValue ?? '',
      },
      'Section 5: Personnel / 人員': {
        'Company Organization Chart / 公司組織架構圖': supplier.organizationChart ?? null,
        'Project Managers / 項目經理': (supplier.projectManagers || []).map(
          mapProjectManager
        ),
        'Do you have Safety Officer(s)? / 是否有安全主任？': mapYesNoValue(
          supplier.hasSafetyOfficer,
          YES_NO_HAVE
        ),
        'Number of Safety Officers / 安全主任人數': supplier.numberOfSafetyOfficers ?? '',
        'Do you have Construction Manager(s)? / 是否有施工經理？': mapYesNoValue(
          supplier.hasConstructionManager,
          YES_NO_HAVE
        ),
        'Number of Construction Managers / 施工經理人數':
          supplier.numberOfConstructionManagers ?? '',
        'Do you have MEP Lead(s)? / 是否有機電負責人？': mapYesNoValue(
          supplier.hasMepLead,
          YES_NO_HAVE
        ),
        'Number of MEP Leads / 機電負責人人數': supplier.numberOfMepLeads ?? '',
      },
      'Section 6: Compliance and Governance / 合規與治理': {
        'If taking projects in Hong Kong, we commit to hiring workers who can legally work in Hong Kong and hold valid HKID and Construction Safety Certificate / 如在香港承接項目，保證聘請可在香港合法工作的工人且持有有效香港身份證與建造業安全證明書（平安咭）':
          supplier.cnHkProjectCompliance ?? false,
        'Insurance / 保險 (At least one required / 至少需要一個)': (supplier.insurances || []).map(
          mapInsurance
        ),
        'Do you have Environmental Health and Safety policy? / 是否有環境健康安全政策？':
          mapYesNoValue(supplier.hasEnvironmentalHealthSafety, YES_NO_HAVE),
        'Environmental Health and Safety Document / 環境健康安全文件':
          supplier.environmentalHealthSafetyFile ?? null,
        'Any incidents in the past 3 years? / 過去3年是否有任何事故？': mapYesNoValue(
          supplier.hasIncidentsPast3Years,
          YES_NO_HAVE
        ),
        'Incidents Report / 事故報告': supplier.incidentsFile ?? null,
        'Any litigation in the past 3 years? / 過去3年是否有任何訴訟？': mapYesNoValue(
          supplier.hasLitigationPast3Years,
          YES_NO_HAVE
        ),
        'Litigation Report / 訴訟報告': supplier.litigationFile ?? null,
      },
      'Quality Commitment / 質量承諾': {
        'Guarantee all information provided is true and valid / 保證提供資料真實有效':
          supplier.guaranteeInfoTrue ?? false,
        'Accept platform quality supervision / 接受平台質量監督':
          supplier.acceptQualitySupervision ?? false,
        'Agree to information sharing terms / 同意信息共享條款':
          supplier.agreeInfoSharing ?? false,
      },
      'Contact Information / 聯絡人資料': {
        'Contact Person / 聯絡人': supplier.submitterName ?? '',
        'Position / 職位': supplier.submitterPosition ?? '',
        'Contact Number / 聯繫電話': formatPhone(
          supplier.submitterPhoneCode,
          supplier.submitterPhone
        ),
        'Email / 電郵': supplier.submitterEmail ?? '',
        'Submission Date / 提交日期': supplier.submissionDate ?? '',
        'Contact Fax / 聯絡傳真': formatPhone(
          supplier.contactFaxCode,
          supplier.contactFax
        ),
      },
    };
  }

  if (supplier?.supplierType === 'designer') {
    return {
      'Section 1: Design Company Overview / 設計公司概況': {
        'Company English Name / 公司英文名': supplier.companyName ?? '',
        'Company Chinese Name / 公司中文名': supplier.companyNameChinese ?? '',
        'Year of Incorporation / 成立年份': supplier.yearEstablished ?? '',
        'Registered Capital Amount / 註冊資本數額': supplier.registeredCapital ?? '',
        'Country / 國家和地區': mapSelectValue(supplier.country ?? '', COUNTRY_LABELS),
        'Office Address / 辦公地址': supplier.officeAddress ?? '',
        'Business Description / 公司或業務簡介': supplier.businessDescription ?? '',
        'Business Registration Number / 商業登記號': supplier.hkBusinessRegistrationNumber ?? '',
        'Business Registration Number / 工商註冊號': supplier.cnBusinessRegistrationNumber ?? '',
        'Unified Social Credit Code / 統一社會信用代碼':
          supplier.cnUnifiedSocialCreditCode ?? '',
        'Employees eligible to work legally in Hong Kong / 可以在香港合法工作的僱員數':
          supplier.hkWorkEligibleEmployees ?? '',
        'Business Registration / 商業登記證': supplier.businessRegistration ?? null,
        'Company Photos / 公司形象照片': supplier.companyPhotos ?? null,
        'Design Awards / 設計獎項': mapAwards(supplier.designAwards),
        'Design Team Size / 設計團隊規模': supplier.designTeamSize ?? '',
        'Prefered Fee Structure / 設計收費模式': mapSelectArray(
          supplier.feeStructure,
          FEE_STRUCTURE_LABELS
        ),
        'Design Highlights / 经典案例': (supplier.designHighlights || []).map(
          mapProjectHighlight
        ),
        'Upload Files / 上傳文件': supplier.companySupplementFile ?? null,
        'Or enter company website / 或輸入公司網站': supplier.companySupplementLink ?? '',
      },
      'Section 2: Design Specialization / 設計專業': {
        'Property Types / 主要項目類型': mapProjectTypes(supplier.projectTypes),
        'Design Styles / 擅長風格': mapDesignStyles(
          supplier.designStyles,
          supplier.projectTypes
        ),
        'BIM Capability / BIM能力': mapYesNoValue(supplier.bimCapability, YES_NO_IS),
        'Main Software / 主要軟件': mapSelectArray(supplier.mainSoftware, SOFTWARE_LABELS),
      },
      'Section 3: Personnel Information / 人員信息': {
        'Organization Chart / 組織架構圖': supplier.organizationChart ?? null,
        'Design Personnel / 設計人員': (supplier.designers || []).map(mapDesigner),
      },
      'Section 4: Design & Build Capability / D&B能力': {
        'Can you provide Design & Build services? / 是否能提供D&B服務？': mapYesNoValue(
          supplier.canDoDesignBuild,
          YES_NO_IS
        ),
        'Section 2: Certifications / 資質與認證': {
          'Do you have RGBC certificate / 是否有RGBC牌': mapYesNoValue(
            supplier.dbConstructionGrade === 'RGBC',
            YES_NO_EN
          ),
          'Certificate Number / 資質證書編號': supplier.dbLicenseNumber ?? '',
          'Certificate Upload / 資質證書上傳': supplier.dbCertificateUpload ?? null,
          'ISO Certification / ISO認證': mapSelectArray(
            supplier.dbIsocertifications,
            ISO_LABELS
          ),
          ...mapIsoUploads(supplier.dbIsoCertificateUploads),
          'Other Certifications / 其他認證': (supplier.dbOtherCertifications || []).map(
            mapCertificationItem
          ),
        },
        'Section 3: Construction Capability / 施工能力': {
          'Property Types / 主要項目類型': mapProjectTypes(supplier.dbProjectTypes),
          'Project Highlights / 亮點項目': (supplier.dbProjectHighlights || []).map(
            mapProjectHighlight
          ),
          'Accumulated Project Area per Year (sqft) / 年施工面積（平方呎）':
            supplier.dbAnnualConstructionCapacity ?? '',
          'Maximum Number of Projects in Parallel / 最多能同時承接的項目數':
            supplier.dbMaxConcurrentProjects ?? '',
          'Average Project Value (HKD) / 平均項目金額（港幣）':
            supplier.dbLargestProjectValue ?? '',
        },
        'Section 5: Personnel / 人員': {
          'Contractor Organization Chart / 施工人员組織架構圖':
            supplier.dbOrganizationChart ?? null,
          'Project Managers / 項目經理': (supplier.dbProjectManagers || []).map(
            mapProjectManager
          ),
          'Do you have Safety Officer(s)? / 是否有安全主任？': mapYesNoValue(
            supplier.dbHasSafetyOfficer,
            YES_NO_HAVE
          ),
          'Number of Safety Officers / 安全主任人數':
            supplier.dbNumberOfSafetyOfficers ?? '',
          'Do you have Construction Manager(s)? / 是否有施工經理？': mapYesNoValue(
            supplier.dbHasConstructionManager,
            YES_NO_HAVE
          ),
          'Number of Construction Managers / 施工經理人數':
            supplier.dbNumberOfConstructionManagers ?? '',
          'Do you have MEP Lead(s)? / 是否有機電負責人？': mapYesNoValue(
            supplier.dbHasMepLead,
            YES_NO_HAVE
          ),
          'Number of MEP Leads / 機電負責人人數': supplier.dbNumberOfMepLeads ?? '',
        },
        'Section 6: Compliance and Governance / 合規與治理': {
          'If taking projects in Hong Kong, we commit to hiring workers who can legally work in Hong Kong and hold valid HKID and Construction Safety Certificate / 如在香港承接項目，保證聘請可在香港合法工作的工人且持有有效香港身份證與建造業安全證明書（平安咭）':
            supplier.dbCnHkProjectCompliance ?? false,
          'Insurance / 保險 (At least one required / 至少需要一個)': (supplier.dbInsurances || []).map(
            mapInsurance
          ),
          'Do you have Environmental Health and Safety policy? / 是否有環境健康安全政策？':
            mapYesNoValue(supplier.dbHasEnvironmentalHealthSafety, YES_NO_HAVE),
          'Environmental Health and Safety Document / 環境健康安全文件':
            supplier.dbEnvironmentalHealthSafetyFile ?? null,
          'Any incidents in the past 3 years? / 過去3年是否有任何事故？': mapYesNoValue(
            supplier.dbHasIncidentsPast3Years,
            YES_NO_HAVE
          ),
          'Incidents Report / 事故報告': supplier.dbIncidentsFile ?? null,
          'Any litigation in the past 3 years? / 過去3年是否有任何訴訟？': mapYesNoValue(
            supplier.dbHasLitigationPast3Years,
            YES_NO_HAVE
          ),
          'Litigation Report / 訴訟報告': supplier.dbLitigationFile ?? null,
        },
      },
      'Quality Commitment / 質量承諾': {
        'Guarantee all information provided is true and valid / 保證提供資料真實有效':
          supplier.guaranteeInfoTrue ?? false,
        'Accept platform quality supervision / 接受平台質量監督':
          supplier.acceptQualitySupervision ?? false,
        'Agree to information sharing terms / 同意信息共享條款':
          supplier.agreeInfoSharing ?? false,
      },
      'Contact Information / 聯絡人資料': {
        'Contact Person / 聯絡人': supplier.submitterName ?? '',
        'Position / 職位': supplier.submitterPosition ?? '',
        'Contact Number / 聯繫電話': formatPhone(
          supplier.submitterPhoneCode,
          supplier.submitterPhone
        ),
        'Email / 電郵': supplier.submitterEmail ?? '',
        'Submission Date / 提交日期': supplier.submissionDate ?? '',
        'Contact Fax / 聯絡傳真': formatPhone(
          supplier.contactFaxCode,
          supplier.contactFax
        ),
      },
    };
  }

  if (supplier?.supplierType === 'material') {
    return {
      'Section 1: Supplier Basic Information / 供應商基本信息': {
        'Company English Name / 公司英文名': supplier.companyName ?? '',
        'Company Chinese Name / 公司中文名': supplier.companyNameChinese ?? '',
        'Year of Incorporation / 成立年份': supplier.yearEstablished ?? '',
        'Registered Capital Amount / 註冊資本數額': supplier.registeredCapital ?? '',
        'Country / 國家和地區': mapSelectValue(supplier.country ?? '', COUNTRY_LABELS),
        'Office/Showroom Address / 辦公/展廳地址': supplier.officeAddress ?? '',
        'Business Description / 公司或業務簡介': supplier.businessDescription ?? '',
        'Business Registration Number / 商業登記號': supplier.hkBusinessRegistrationNumber ?? '',
        'Business Registration Number / 工商註冊號': supplier.cnBusinessRegistrationNumber ?? '',
        'Unified Social Credit Code / 統一社會信用代碼':
          supplier.cnUnifiedSocialCreditCode ?? '',
        'Employees eligible to work legally in Hong Kong / 可以在香港合法工作的僱員數':
          supplier.hkWorkEligibleEmployees ?? '',
        'Business Registration / 商業登記證': supplier.businessRegistration ?? null,
        'Company Photos / 公司形象照片': supplier.companyPhotos ?? null,
        'Company Type / 公司類型': mapSelectArray(supplier.companyType, COMPANY_TYPE_LABELS),
        'Represented Brands / 代理品牌': supplier.representedBrands ?? [],
        'Warehouse Information / 倉庫信息': (supplier.warehouses || []).map(mapWarehouse),
        'Upload Files / 上傳文件': supplier.companySupplementFile ?? null,
        'Or enter company website / 或輸入公司網站': supplier.companySupplementLink ?? '',
      },
      'Section 2: Product Management System / 產品管理系統': {
        'Products / 產品': (supplier.products || []).map(mapProduct),
      },
      'Section 3: Project Highlights / 亮點項目': (supplier.projectHighlights || []).map(
        mapProjectHighlight
      ),
      'Section 4: Sample Service / 樣品服務': {
        'Sample Provided / 樣品提供': mapYesNoValue(
          supplier.sampleProvided,
          YES_NO_IS
        ),
        'Sample Cost / 樣品費用': mapSelectValue(
          supplier.sampleCost ?? '',
          SAMPLE_COST_LABELS
        ),
        'Sample Delivery Time to HK / 樣品到香港寄送時間 (days)':
          supplier.sampleDeliveryTime ?? '',
        'Free Shipping to Hong Kong / 是否免費邮寄到香港': mapYesNoValue(
          supplier.freeShippingToHK,
          YES_NO_IS
        ),
      },
      'Quality Commitment / 質量承諾': {
        'Guarantee all information provided is true and valid / 保證提供資料真實有效':
          supplier.guaranteeInfoTrue ?? false,
        'Accept platform quality supervision / 接受平台質量監督':
          supplier.acceptQualitySupervision ?? false,
        'Agree to information sharing terms / 同意信息共享條款':
          supplier.agreeInfoSharing ?? false,
      },
      'Contact Information / 聯絡人資料': {
        'Contact Person / 聯絡人': supplier.submitterName ?? '',
        'Position / 職位': supplier.submitterPosition ?? '',
        'Contact Number / 聯繫電話': formatPhone(
          supplier.submitterPhoneCode,
          supplier.submitterPhone
        ),
        'Email / 電郵': supplier.submitterEmail ?? '',
        'Submission Date / 提交日期': supplier.submissionDate ?? '',
        'Contact Fax / 聯絡傳真': formatPhone(
          supplier.contactFaxCode,
          supplier.contactFax
        ),
      },
    };
  }

  return {};
};

export default function DashboardClient() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const isTestMode = searchParams.get('test') !== null;
  const didLoadRef = useRef(false);
  const [userData, setUserData] = useState<SupplierFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [supplierStatus, setSupplierStatus] = useState<'draft' | 'submitted' | null>(null);
  const [isGeneratingPpt, setIsGeneratingPpt] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError('');
  }, [error, toast]);

  const syncProducts = async (nextProducts: Product[]) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error('Please sign in to save products / 請先登入再保存產品');
    }

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ products: nextProducts }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to save products');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (didLoadRef.current) return;
      didLoadRef.current = true;
      setIsLoading(true);
      setError('');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setIsLoading(false);
        router.replace('/');
        return;
      }

      try {
        const meRes = await fetch('/api/suppliers/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          const body = await meRes.json().catch(() => ({}));
          if (meRes.status === 401 || String(body.error || '').includes('Invalid auth token')) {
            await supabase.auth.signOut({ scope: 'local' });
            router.replace('/');
            return;
          }
          throw new Error(body.error || 'Failed to load supplier data');
        }

        const meBody = await meRes.json();
        if (!meBody.supplier) {
          setIsLoading(false);
          router.replace('/register/supplier');
          return;
        }

        const supplier = meBody.supplier as SupplierFormData;
        const status = meBody.status as 'draft' | 'submitted' | null;
        setSupplierStatus(status);
        setUserData(supplier);
        setProducts(supplier.supplierType === 'material' ? supplier.products || [] : []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setEditingIndex(undefined);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product, index: number) => {
    setEditingProduct(product);
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (product: Product) => {
    if (!userData || userData.supplierType !== 'material') return;

    setError('');
    const specCheck = validateOptionalUrl(
      product.specificationLink,
      'Product specification link / 產品規格連結'
    );
    if (!specCheck.ok) {
      setError(specCheck.error || 'Invalid product specification URL');
      return;
    }
    const mapped: Product = { ...product };
    const exists = products.find((p) => p.id === product.id);
    const nextProducts = exists
      ? products.map((p) => (p.id === product.id ? mapped : p))
      : [mapped, ...products];

    try {
      await syncProducts(nextProducts);
      setProducts(nextProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save products');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!userData || userData.supplierType !== 'material') return;

    if (confirm('Are you sure you want to delete this product? / 確定要刪除此產品嗎？')) {
      setError('');
      const nextProducts = products.filter((p) => p.id !== id);
      try {
        await syncProducts(nextProducts);
        setProducts(nextProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save products');
      }
    }
  };

  const handleImportProducts = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!userData || userData.supplierType !== 'material') return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { products: imported, errors } = await parseProductImportFile(file);
      if (imported.length === 0 && errors.length === 0) {
        toast.error('未读取到任何产品数据，请检查模板。');
        return;
      }

      if (imported.length > 0) {
        const nextProducts = [...products, ...imported];
        await syncProducts(nextProducts);
        setProducts(nextProducts);
      }

      const messages: string[] = [];
      if (imported.length > 0) {
        messages.push(`已导入 ${imported.length} 个产品。`);
      }
      if (errors.length > 0) {
        messages.push(`以下行有问题，已跳过：\n${errors.join('\n')}`);
      }
      if (messages.length > 0) {
        if (errors.length > 0) {
          toast.error(messages.join('\n\n'));
        } else {
          toast.success(messages.join('\n\n'));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败，请检查文件格式。');
    } finally {
      event.target.value = '';
    }
  };

  const handleGeneratePpt = async () => {
    if (!userData) return;
    if (userData.supplierType === 'basic') return;
    if (isGeneratingPpt) return;

    try {
      setIsGeneratingPpt(true);
      const paths = new Set<string>();
      collectStoragePaths(userData, paths);

      let payload: unknown = userData;
      if (paths.size > 0) {
        const signedMap = new Map<string, string>();
        await Promise.all(
          Array.from(paths).map(async (path) => {
            const { data, error } = await supabase.storage
              .from(STORAGE_BUCKET)
              .createSignedUrl(path, 60 * 60);
            if (!error && data?.signedUrl) {
              signedMap.set(path, data.signedUrl);
            }
          })
        );
        payload = replaceStoragePaths(userData, signedMap);
      }

      const labeledPayload = buildBilingualPayload(payload, supplierStatus);
      const prunedPayload = pruneEmpty(labeledPayload) || {};

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Please sign in first / 請先登入');
      }

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), 600_000);
      let res: Response;
      try {
        res = await fetch('/api/ppt/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: prunedPayload }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutHandle);
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate PPT');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || 'supplier-report.pptx';
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success('PPT 已生成並開始下載');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('生成超时，请重试 / Request timed out, please retry');
        return;
      }
      console.error('Failed to generate PPT:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PPT / 生成PPT失敗');
    } finally {
      setIsGeneratingPpt(false);
    }
  };

  // Get unique categories
  const categories = products.length > 0
    ? ['all', ...Array.from(new Set(products.map(p => p.category)))]
    : ['all'];

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading... / 加載中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {supplierStatus === 'draft' && userData && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Draft saved. Please complete your registration / 草稿已保存，請繼續完成註冊。
            <button
              className="ml-3 font-medium underline hover:text-amber-900"
              onClick={() =>
                router.push(
                  userData.supplierType === 'basic' ? '/register/basic' : '/register/supplier'
                )
              }
            >
              Continue / 繼續
            </button>
          </div>
        )}
        {/* Welcome Section */}
        <div className="bg-white border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-light text-gray-900">
              Welcome / 歡迎
            </h2>
            {isTestMode &&
             userData &&
             userData.supplierType !== 'basic' &&
             supplierStatus === 'submitted' && (
              <button
                type="button"
                onClick={handleGeneratePpt}
                disabled={isGeneratingPpt}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-light hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 transition-colors"
              >
                {isGeneratingPpt ? '生成中...' : '生成PPT'}
              </button>
            )}
          </div>
          <p className="mb-4 text-sm text-gray-600">
            AI制作公司手册功能即将上线 / AI Company Brochure feature coming soon.
          </p>
          {userData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Company / 公司</p>
                <p className="text-base text-gray-900">
                  {(userData as any).companyName ||
                    (userData as any).companyNameChinese ||
                    (userData as any).companyLegalName ||
                    '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Supplier Type / 供應商類型</p>
                <p className="text-base text-gray-900">
                  {userData.supplierType === 'contractor' && 'Contractor / 承包商'}
                  {userData.supplierType === 'designer' && 'Designer / 設計師'}
                  {userData.supplierType === 'material' && 'Material/Furniture Supplier / 材料家具供應商'}
                  {userData.supplierType === 'basic' && 'Other Suppliers / 其他供应商'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Contact / 聯繫人</p>
                <p className="text-base text-gray-900">
                  {(userData as any).submitterName ||
                    (userData as any).submitterEmail ||
                    (userData as any).contactEmail ||
                    '-'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Product Statistics - Only show for material suppliers */}
        {userData?.supplierType === 'material' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Products / 總產品</p>
                  <p className="text-2xl font-light text-gray-900">
                    {products.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categories / 類別</p>
                  <p className="text-2xl font-light text-gray-900">
                    {categories.length - 1}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <button
                onClick={handleAddProduct}
                className="w-full h-full flex flex-col items-center justify-center hover:bg-gray-50 transition-colors group"
              >
                <div className="w-12 h-12 bg-gray-900 group-hover:bg-gray-800 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-light text-gray-900">
                  Add Products / 添加產品
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Product Management - Only show for material suppliers */}
        {userData?.supplierType === 'material' && (
          <div className="bg-white border border-gray-200 p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
              <h3 className="text-lg font-light text-gray-900">
                Product Catalog / 產品目錄
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/api/products/template"
                  className="px-3 py-1.5 border border-gray-300 text-xs font-light text-gray-700 hover:bg-gray-50 transition-colors"
                  download
                >
                  Download Template / 下載模板
                </a>
                <label className="px-3 py-1.5 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors cursor-pointer">
                  Import Excel / 上傳Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportProducts}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <input
                  type="text"
                  placeholder="Search products... / 搜索產品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories / 所有類別' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <p className="text-xs text-gray-500">
                Showing {filteredProducts.length} of {products.length} products
                <br />
                顯示 {filteredProducts.length} / {products.length} 個產品
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">每页显示</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Products List */}
            {products.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="mt-4 text-sm text-gray-500 mb-4">
                  No products added yet
                  <br />
                  尚未添加產品
                </p>
                <button
                  onClick={handleAddProduct}
                  className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
                >
                  Add Your First Product / 添加您的第一個產品
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 border border-gray-300">
                <p className="text-sm text-gray-500">
                  No products match your search
                  <br />
                  沒有符合搜索條件的產品
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                        Brand / 品牌
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                        Category / 類別
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                        Product Name / 產品名稱
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                        Price / 價格
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                        MOQ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                        Lead Time / 货期
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                        Actions / 操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedProducts.map((product, index) => {
                      const displayIndex = (safePage - 1) * pageSize + index;
                      return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.sku}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.brand}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.category}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            {product.spec && (
                              <p className="text-xs text-gray-500">{product.spec}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.unitPrice ? `HKD ${parseInt(product.unitPrice).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.moq}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.leadTime ? `${product.leadTime} days` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditProduct(product, displayIndex)}
                              className="text-blue-600 hover:text-blue-800 font-light"
                            >
                              Edit / 編輯
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-800 font-light"
                            >
                              Delete / 刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
                  <span>
                    Page {safePage} / {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safePage <= 1}
                      className="px-3 py-1 border border-gray-300 text-xs disabled:opacity-50"
                    >
                      Prev / 上一頁
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={safePage >= totalPages}
                      className="px-3 py-1 border border-gray-300 text-xs disabled:opacity-50"
                    >
                      Next / 下一頁
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Section for Non-Material Suppliers */}
        {userData?.supplierType !== 'material' && (
          <div className="bg-white border border-gray-200 p-8">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-light text-gray-900">
                {userData?.supplierType === 'contractor' && 'Contractor Dashboard / 承包商儀表板'}
                {userData?.supplierType === 'designer' && 'Designer Dashboard / 設計師儀表板'}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {supplierStatus === 'draft' ? (
                  <>
                    Draft saved. Please complete your registration.
                    <br />
                    草稿已保存，請繼續完成註冊。
                  </>
                ) : (
                  <>
                    Your profile has been successfully registered.
                    <br />
                    您的檔案已成功註冊。
                  </>
                )}
              </p>
              <button
                onClick={() =>
                  router.push(
                    userData?.supplierType === 'basic'
                      ? '/register/basic'
                      : '/register/supplier'
                  )
                }
                className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
              >
                {supplierStatus === 'draft'
                  ? 'Continue Registration / 繼續填寫'
                  : 'Edit Profile / 編輯檔案'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal - Only for material suppliers */}
      {userData?.supplierType === 'material' && (
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          product={editingProduct}
          productIndex={editingIndex}
        />
      )}
    </div>
  );
}

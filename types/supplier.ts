export type UploadValue = File | string;
export type UploadList = UploadValue[];

// Common Product Interface
export interface Product {
  id: string;
  sku?: string; // Changed to optional
  productName: string;
  category: string;
  brand: string;
  series?: string; // Changed to optional
  spec: string;
  material?: string; // Changed to optional
  unitPrice: string;
  moq: string;
  origin: string; // New field: place of origin/production (required)
  leadTime: string;
  currentStock?: string; // New field: current inventory
  photos?: UploadList; // New field: product photos (max 9)
  specificationFile?: UploadValue | null; // New field: specification PDF
  specificationLink?: string; // New field: specification URL
  model3D: UploadValue | null;
}

// Project Manager Project Interface
export interface ProjectManagerProject {
  id: string;
  projectName: string;
  clientName: string;
  year: string;
  buildingName: string;
  area: string;
}

// Project Manager Interface
export interface ProjectManager {
  id: string;
  name: string;
  yearsExperience: string;
  languages: string;
  mainProject: string;
  year: string;
  address: string;
  area: string;
  projects: ProjectManagerProject[];
  cv: UploadValue | null;
}

// Insurance Interface
export interface Insurance {
  id: string;
  type: string;
  provider: string;
  expiryDate: string;
  file: UploadValue | null;
}

// Certification item for dynamic lists
export interface CertificationItem {
  id: string;
  name: string;
  file: UploadValue | null;
}

// Designer Project Interface
export interface DesignerProject {
  id: string;
  projectName: string;
  year: string;
  address: string;
  area: string;
  renovationType: 'newFitout' | 'remodel' | '';
  projectTypes?: string[]; // Project types for each project highlight
  projectHighlight?: boolean; // Flag to mark the project as a highlight
  photos: UploadList;
}

// Designer Personnel Interface
export interface Designer {
  id: string;
  name: string;
  experience: string;
  languages: string;
  cv: UploadValue | null;
  projects: DesignerProject[];
}

// Common Requirements for all suppliers
export interface CommonRequirements {
  // Document Upload
  businessRegistration: UploadValue | null;
  companyPhotos: UploadValue | null;
  hkBusinessRegistrationNumber: string;
  cnBusinessRegistrationNumber: string;
  cnUnifiedSocialCreditCode: string;

  // Quality Commitment
  guaranteeInfoTrue: boolean;
  acceptQualitySupervision: boolean;
  agreeInfoSharing: boolean;

  // Submitter Information
  submitterName: string;
  submitterPosition: string;
  submitterPhoneCode: string;
  submitterPhone: string;
  submitterEmail: string;
  contactFaxCode?: string;
  contactFax?: string;
  submissionDate: string;
}

// Contractor Form Data
export interface ContractorFormData extends CommonRequirements {
  supplierType: 'contractor';

  // Section 1: Company Profile
  companyName: string;
  companyNameChinese?: string;
  yearEstablished: string;
  registeredCapital: string;
  numberOfEmployees: string;
  country: string;
  officeAddress: string;
  businessDescription?: string;
  companySupplementFile: UploadList | null; // Company supplementary information (PDF)
  companySupplementLink: string; // Company supplementary information (Link)
  hkWorkEligibleEmployees: string;

  // Section 2: Certifications
  constructionGrade: string;
  licenseNumber: string;
  certificateUpload: UploadValue | null;
  isocertifications: string[]; // ['9001', '14001', '45001']
  isoCertificateUploads: Record<string, UploadValue | null>;
  otherCertifications: CertificationItem[];

  // Section 3: Construction Capability
  projectTypes: string[]; // ['residential', 'commercial', 'office', etc.]
  projectHighlights: DesignerProject[]; // Project highlights (reusing DesignerProject type)
  annualConstructionCapacity: string;
  maxConcurrentProjects: string;
  largestProjectValue: string;

  // Section 5: Personnel
  projectManagers: ProjectManager[];
  organizationChart: UploadValue | null;
  hasSafetyOfficer: 'yes' | 'no' | '';
  numberOfSafetyOfficers: string;
  hasConstructionManager: 'yes' | 'no' | '';
  numberOfConstructionManagers: string;
  hasMepLead: 'yes' | 'no' | '';
  numberOfMepLeads: string;
  cnHkProjectCompliance: boolean;

  // Section 6: Compliance and Governance
  insurances: Insurance[];
  hasEnvironmentalHealthSafety: 'yes' | 'no' | '';
  environmentalHealthSafetyFile: UploadValue | null;
  hasIncidentsPast3Years: 'yes' | 'no' | '';
  incidentsFile: UploadValue | null;
  hasLitigationPast3Years: 'yes' | 'no' | '';
  litigationFile: UploadValue | null;
}

// Designer Form Data
export interface DesignerFormData extends CommonRequirements {
  supplierType: 'designer';

  // Section 1: Design Company Overview
  companyName: string;
  companyNameChinese?: string;
  yearEstablished: string;
  registeredCapital: string;
  country: string;
  officeAddress: string;
  businessDescription?: string;
  hkWorkEligibleEmployees: string;
  designAwards: string[]; // Design awards (array)
  designTeamSize: string;
  feeStructure: string[]; // ['byArea', 'byProject', 'byPeriod', 'other']
  designHighlights: DesignerProject[]; // Key design highlights
  companySupplementFile: UploadList | null; // Company supplementary information (PDF)
  companySupplementLink: string; // Company supplementary information (Link)

  // Section 2: Design Specialization
  designStyles: string[]; // ['modernMinimalist', 'chinese', 'european', etc.]
  projectTypes: string[]; // ['residential', 'commercial', 'office', etc.]
  bimCapability: 'yes' | 'no' | '';
  mainSoftware: string[];

  // Section 3: Personnel Information
  designers: Designer[];
  organizationChart: UploadValue | null;

  // Section 4: Design & Build Capability
  canDoDesignBuild: 'yes' | 'no' | '';

  // D&B Contractor Information (same as ContractorFormData)
  dbConstructionGrade: string;
  dbLicenseNumber: string;
  dbCertificateUpload: UploadValue | null;
  dbIsocertifications: string[];
  dbIsoCertificateUploads: Record<string, UploadValue | null>;
  dbOtherCertifications: CertificationItem[];
  dbProjectTypes: string[];
  dbProjectHighlights: DesignerProject[];
  dbAnnualConstructionCapacity: string;
  dbMaxConcurrentProjects: string;
  dbLargestProjectValue: string;
  dbProjectManagers: ProjectManager[];
  dbOrganizationChart: UploadValue | null;
  dbHasSafetyOfficer: 'yes' | 'no' | '';
  dbNumberOfSafetyOfficers: string;
  dbHasConstructionManager: 'yes' | 'no' | '';
  dbNumberOfConstructionManagers: string;
  dbHasMepLead: 'yes' | 'no' | '';
  dbNumberOfMepLeads: string;
  dbCnHkProjectCompliance: boolean;
  dbInsurances: Insurance[];
  dbHasEnvironmentalHealthSafety: 'yes' | 'no' | '';
  dbEnvironmentalHealthSafetyFile: UploadValue | null;
  dbHasIncidentsPast3Years: 'yes' | 'no' | '';
  dbIncidentsFile: UploadValue | null;
  dbHasLitigationPast3Years: 'yes' | 'no' | '';
  dbLitigationFile: UploadValue | null;
}

// Material/Furniture Supplier Form Data
export interface MaterialSupplierFormData extends CommonRequirements {
  supplierType: 'material';

  // Section 1: Supplier Basic Information
  companyName: string;
  companyNameChinese?: string;
  yearEstablished: string;
  registeredCapital: string;
  country: string;
  officeAddress: string;
  businessDescription?: string;
  hkWorkEligibleEmployees: string;
  companyType: string[]; // ['manufacturer', 'agent', 'distributor']
  representedBrands: string[];
  warehouses: { address: string; capacity: string }[];
  companySupplementFile: UploadList | null; // Company supplementary information (PDF)
  companySupplementLink: string; // Company supplementary information (Link)

  // Section 2: Product Management System
  products: Product[];

  // Section 3: Project Highlights
  projectHighlights: DesignerProject[];

  // Section 4: Sample Service
  sampleProvided: 'yes' | 'no' | '';
  sampleCost: 'free' | 'charged' | '';
  sampleDeliveryTime: string;
  freeShippingToHK: 'yes' | 'no' | '';
}

// Basic Supplier Form Data
export interface BasicSupplierFormData {
  supplierType: 'basic';

  // Required fields
  companyName: string;
  companyNameChinese?: string; // Optional
  country: string;
  officeAddress: string;
  businessType: string;
  submitterName: string;
  submitterPosition: string;
  submitterPhone: string;
  submitterPhoneCode: string;
  submitterEmail: string;
  contactFaxCode?: string;
  contactFax?: string;

  // Optional fields
  businessDescription?: string;
  companySupplementLink?: string;
  companyLogo?: UploadValue | null;

  // Metadata
  submissionDate: string;
}

export interface SupplierDirectoryEntry {
  supplierType: 'basic' | 'contractor' | 'designer' | 'material';
  companyName: string;
  companyNameChinese?: string;
  country: string;
  officeAddress: string;
  businessType: string;
  submitterName: string;
  submitterPosition: string;
  submitterPhone: string;
  submitterPhoneCode: string;
  submitterEmail: string;
  contactFaxCode?: string;
  contactFax?: string;
  businessDescription?: string;
  companySupplementLink?: string;
  companyLogo?: UploadValue | null;
  submissionDate: string;
  representedBrands?: string[];
}

// Union type for all supplier form data
export type SupplierFormData =
  | ContractorFormData
  | DesignerFormData
  | MaterialSupplierFormData
  | BasicSupplierFormData;

// Type guard functions
export function isContractorForm(
  data: SupplierFormData
): data is ContractorFormData {
  return data.supplierType === 'contractor';
}

export function isDesignerForm(
  data: SupplierFormData
): data is DesignerFormData {
  return data.supplierType === 'designer';
}

export function isMaterialSupplierForm(
  data: SupplierFormData
): data is MaterialSupplierFormData {
  return data.supplierType === 'material';
}

export function isBasicSupplierForm(
  data: SupplierFormData
): data is BasicSupplierFormData {
  return data.supplierType === 'basic';
}

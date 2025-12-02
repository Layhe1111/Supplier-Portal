// Common Product Interface
export interface Product {
  id: string;
  sku: string;
  productName: string;
  category: string;
  brand: string;
  series: string;
  spec: string;
  material: string;
  unitPrice: string;
  moq: string;
  leadTime: string;
  model3D: File | null;
}

// Project Manager Interface
export interface ProjectManager {
  id: string;
  name: string;
  languages: string;
  mainProject: string;
  year: string;
  address: string;
  area: string;
  cv: File | null;
}

// Insurance Interface
export interface Insurance {
  id: string;
  type: string;
  provider: string;
  expiryDate: string;
  file: File | null;
}

// Common Requirements for all suppliers
export interface CommonRequirements {
  // Document Upload
  businessRegistration: File | null;
  companyPhotos: File | null;

  // Quality Commitment
  guaranteeInfoTrue: boolean;
  acceptQualitySupervision: boolean;
  agreeInfoSharing: boolean;

  // Submitter Information
  submitterName: string;
  submitterPosition: string;
  submitterPhone: string;
  submissionDate: string;
}

// Contractor Form Data
export interface ContractorFormData extends CommonRequirements {
  supplierType: 'contractor';

  // Section 1: Company Profile
  companyLegalName: string;
  yearEstablished: string;
  registeredCapital: string;
  numberOfEmployees: string;
  officeAddress: string;

  // Section 2: Certifications
  constructionGrade: string;
  licenseNumber: string;
  certificateUpload: File | null;
  safetyProductionLicense: 'yes' | 'no' | '';
  isocertifications: string[]; // ['9001', '14001', '45001']
  otherCertifications: string;

  // Section 3: Construction Capability
  projectTypes: string[]; // ['residential', 'commercial', 'office', etc.]
  annualConstructionCapacity: string;
  maxConcurrentProjects: string;
  largestProjectValue: string;

  // Section 5: Personnel
  projectManagers: ProjectManager[];
  organizationChart: File | null;
  hasSafetyOfficer: 'yes' | 'no' | '';
  numberOfSafetyOfficers: string;
  hasConstructionManager: 'yes' | 'no' | '';
  numberOfConstructionManagers: string;

  // Section 6: Compliance and Governance
  insurances: Insurance[];
  hasEnvironmentalHealthSafety: 'yes' | 'no' | '';
  environmentalHealthSafetyFile: File | null;
  hasIncidentsPast3Years: 'yes' | 'no' | '';
  incidentsFile: File | null;
  hasLitigationPast3Years: 'yes' | 'no' | '';
  litigationFile: File | null;
}

// Designer Form Data
export interface DesignerFormData extends CommonRequirements {
  supplierType: 'designer';

  // Section 1: Design Company Overview
  companyLegalName: string;
  yearEstablished: string;
  registeredCapital: string;
  officeAddress: string;
  designQualificationLevel: string;
  designTeamSize: string;
  leadDesignerExperience: string;
  feeStructure: string[]; // ['byArea', 'byProject', 'other']

  // Section 2: Design Specialization
  designStyles: string[]; // ['modernMinimalist', 'chinese', 'european', etc.]
  bimCapability: 'yes' | 'no' | '';
  mainSoftware: string;
}

// Material/Furniture Supplier Form Data
export interface MaterialSupplierFormData extends CommonRequirements {
  supplierType: 'material';

  // Section 1: Supplier Basic Information
  companyLegalName: string;
  yearEstablished: string;
  registeredCapital: string;
  officeAddress: string;
  companyType: string[]; // ['manufacturer', 'agent', 'distributor']
  representedBrands: string;
  warehouseAddress: string;
  storageCapacity: string;

  // Section 2: Product Management System
  products: Product[];

  // Section 3: Sample Service
  sampleProvided: 'yes' | 'no' | '';
  sampleCost: 'free' | 'charged' | '';
  sampleDeliveryTime: string;
}

// Union type for all supplier form data
export type SupplierFormData =
  | ContractorFormData
  | DesignerFormData
  | MaterialSupplierFormData;

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

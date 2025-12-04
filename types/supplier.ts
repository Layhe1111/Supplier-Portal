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
  photos?: File[]; // New field: product photos (max 9)
  specificationFile?: File | null; // New field: specification PDF
  specificationLink?: string; // New field: specification URL
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

// Designer Project Interface
export interface DesignerProject {
  id: string;
  projectName: string;
  year: string;
  address: string;
  area: string;
  renovationType: 'newFitout' | 'remodel' | '';
  photos: File[];
}

// Designer Personnel Interface
export interface Designer {
  id: string;
  name: string;
  experience: string;
  cv: File | null;
  projects: DesignerProject[];
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
  submitterEmail: string;
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
  country: string;
  officeAddress: string;
  companySupplementFile: File | null; // Company supplementary information (PDF)
  companySupplementLink: string; // Company supplementary information (Link)

  // Section 2: Certifications
  constructionGrade: string;
  licenseNumber: string;
  certificateUpload: File | null;
  safetyProductionLicense: 'yes' | 'no' | '';
  isocertifications: string[]; // ['9001', '14001', '45001']
  otherCertifications: string;

  // Section 3: Construction Capability
  projectTypes: string[]; // ['residential', 'commercial', 'office', etc.]
  projectHighlights: DesignerProject[]; // Project highlights (reusing DesignerProject type)
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
  country: string;
  officeAddress: string;
  designAwards: string[]; // Design awards (array)
  designTeamSize: string;
  feeStructure: string[]; // ['byArea', 'byProject', 'other']
  companySupplementFile: File | null; // Company supplementary information (PDF)
  companySupplementLink: string; // Company supplementary information (Link)

  // Section 2: Design Specialization
  designStyles: string[]; // ['modernMinimalist', 'chinese', 'european', etc.]
  projectTypes: string[]; // ['residential', 'commercial', 'office', etc.]
  bimCapability: 'yes' | 'no' | '';
  mainSoftware: string[];

  // Section 3: Personnel Information
  designers: Designer[];
  organizationChart: File | null;

  // Section 4: Design & Build Capability
  canDoDesignBuild: 'yes' | 'no' | '';

  // D&B Contractor Information (same as ContractorFormData)
  dbConstructionGrade: string;
  dbLicenseNumber: string;
  dbCertificateUpload: File | null;
  dbSafetyProductionLicense: 'yes' | 'no' | '';
  dbIsocertifications: string[];
  dbOtherCertifications: string;
  dbProjectTypes: string[];
  dbAnnualConstructionCapacity: string;
  dbMaxConcurrentProjects: string;
  dbLargestProjectValue: string;
  dbProjectManagers: ProjectManager[];
  dbOrganizationChart: File | null;
  dbHasSafetyOfficer: 'yes' | 'no' | '';
  dbNumberOfSafetyOfficers: string;
  dbHasConstructionManager: 'yes' | 'no' | '';
  dbNumberOfConstructionManagers: string;
  dbInsurances: Insurance[];
  dbHasEnvironmentalHealthSafety: 'yes' | 'no' | '';
  dbEnvironmentalHealthSafetyFile: File | null;
  dbHasIncidentsPast3Years: 'yes' | 'no' | '';
  dbIncidentsFile: File | null;
  dbHasLitigationPast3Years: 'yes' | 'no' | '';
  dbLitigationFile: File | null;
}

// Material/Furniture Supplier Form Data
export interface MaterialSupplierFormData extends CommonRequirements {
  supplierType: 'material';

  // Section 1: Supplier Basic Information
  companyLegalName: string;
  yearEstablished: string;
  registeredCapital: string;
  country: string;
  officeAddress: string;
  companyType: string[]; // ['manufacturer', 'agent', 'distributor']
  representedBrands: string[];
  warehouses: { address: string; capacity: string }[];
  companySupplementFile: File | null; // Company supplementary information (PDF)
  companySupplementLink: string; // Company supplementary information (Link)

  // Section 2: Product Management System
  products: Product[];

  // Section 3: Sample Service
  sampleProvided: 'yes' | 'no' | '';
  sampleCost: 'free' | 'charged' | '';
  sampleDeliveryTime: string;
  freeShippingToHK: 'yes' | 'no' | '';
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

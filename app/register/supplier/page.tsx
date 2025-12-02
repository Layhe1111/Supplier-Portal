'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SupplierFormData,
  ContractorFormData,
  DesignerFormData,
  MaterialSupplierFormData,
} from '@/types/supplier';
import ContractorQuestionnaire from '@/components/questionnaires/ContractorQuestionnaire';
import DesignerQuestionnaire from '@/components/questionnaires/DesignerQuestionnaire';
import MaterialSupplierQuestionnaire from '@/components/questionnaires/MaterialSupplierQuestionnaire';
import CommonRequirements from '@/components/questionnaires/CommonRequirements';

export default function SupplierRegistrationPage() {
  const router = useRouter();
  const [supplierType, setSupplierType] = useState<
    'contractor' | 'designer' | 'material' | null
  >(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialize form data based on supplier type
  const [formData, setFormData] = useState<SupplierFormData | null>(null);

  // Check if user is logged in and load existing data if in edit mode
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/');
      return;
    }

    // Check if there's existing supplier data (edit mode)
    const existingData = localStorage.getItem('supplierData');
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData);
        setSupplierType(parsed.supplierType);
        setFormData(parsed);
        setIsEditMode(true);
      } catch (error) {
        console.error('Failed to load existing data:', error);
      }
    }

    setIsCheckingAuth(false);
  }, [router]);

  // Initialize form data when supplier type is selected
  useEffect(() => {
    if (supplierType && !formData) {
      const commonFields = {
        businessRegistration: null,
        companyPhotos: null,
        guaranteeInfoTrue: false,
        acceptQualitySupervision: false,
        agreeInfoSharing: false,
        submitterName: '',
        submitterPosition: '',
        submitterPhone: '',
        submitterEmail: '',
        submissionDate: new Date().toISOString().split('T')[0],
      };

      if (supplierType === 'contractor') {
        const contractorData: ContractorFormData = {
          supplierType: 'contractor',
          ...commonFields,
          companyLegalName: '',
          yearEstablished: '',
          registeredCapital: '',
          numberOfEmployees: '',
          officeAddress: '',
          constructionGrade: '',
          licenseNumber: '',
          certificateUpload: null,
          safetyProductionLicense: '',
          isocertifications: [],
          otherCertifications: '',
          projectTypes: [],
          annualConstructionCapacity: '',
          maxConcurrentProjects: '',
          largestProjectValue: '',
          projectManagers: [],
          organizationChart: null,
          hasSafetyOfficer: '',
          numberOfSafetyOfficers: '',
          hasConstructionManager: '',
          numberOfConstructionManagers: '',
          insurances: [{
            id: Date.now().toString(),
            type: '',
            provider: '',
            expiryDate: '',
            file: null,
          }],
          hasEnvironmentalHealthSafety: '',
          environmentalHealthSafetyFile: null,
          hasIncidentsPast3Years: '',
          incidentsFile: null,
          hasLitigationPast3Years: '',
          litigationFile: null,
        };
        setFormData(contractorData);
      } else if (supplierType === 'designer') {
        const designerData: DesignerFormData = {
          supplierType: 'designer',
          ...commonFields,
          companyLegalName: '',
          yearEstablished: '',
          registeredCapital: '',
          officeAddress: '',
          designQualificationLevel: '',
          designTeamSize: '',
          feeStructure: [],
          designStyles: [],
          projectTypes: [],
          bimCapability: '',
          mainSoftware: [''],
          designers: [],
          organizationChart: null,
          canDoDesignBuild: '',
          dbConstructionGrade: '',
          dbLicenseNumber: '',
          dbCertificateUpload: null,
          dbSafetyProductionLicense: '',
          dbIsocertifications: [],
          dbOtherCertifications: '',
          dbProjectTypes: [],
          dbAnnualConstructionCapacity: '',
          dbMaxConcurrentProjects: '',
          dbLargestProjectValue: '',
          dbProjectManagers: [],
          dbOrganizationChart: null,
          dbHasSafetyOfficer: '',
          dbNumberOfSafetyOfficers: '',
          dbHasConstructionManager: '',
          dbNumberOfConstructionManagers: '',
          dbInsurances: [{
            id: Date.now().toString(),
            type: '',
            provider: '',
            expiryDate: '',
            file: null,
          }],
          dbHasEnvironmentalHealthSafety: '',
          dbEnvironmentalHealthSafetyFile: null,
          dbHasIncidentsPast3Years: '',
          dbIncidentsFile: null,
          dbHasLitigationPast3Years: '',
          dbLitigationFile: null,
        };
        setFormData(designerData);
      } else if (supplierType === 'material') {
        const materialData: MaterialSupplierFormData = {
          supplierType: 'material',
          ...commonFields,
          companyLegalName: '',
          yearEstablished: '',
          registeredCapital: '',
          officeAddress: '',
          companyType: [],
          representedBrands: [''],
          warehouses: [{ address: '', capacity: '' }],
          products: [],
          sampleProvided: '',
          sampleCost: '',
          sampleDeliveryTime: '',
          freeShippingToHK: '',
        };
        setFormData(materialData);
      }
    }
  }, [supplierType, formData]);

  // Auto-save draft
  useEffect(() => {
    if (formData) {
      const timer = setTimeout(() => {
        const draftData = {
          supplierType,
          formData: JSON.stringify(formData, (key, value) => {
            if (value instanceof File) return null;
            return value;
          }),
        };
        localStorage.setItem('supplierDraft', JSON.stringify(draftData));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [formData, supplierType]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('supplierDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.supplierType && parsed.formData) {
          setSupplierType(parsed.supplierType);
          setFormData(JSON.parse(parsed.formData));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  const updateField = <T extends SupplierFormData>(
    field: keyof T,
    value: any
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData) return;

    // Validate common requirements
    if (
      !formData.guaranteeInfoTrue ||
      !formData.acceptQualitySupervision ||
      !formData.agreeInfoSharing
    ) {
      alert(
        'Please accept all quality commitments / 請接受所有質量承諾'
      );
      return;
    }

    localStorage.setItem('supplierData', JSON.stringify(formData));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.removeItem('supplierDraft');

    router.push('/dashboard');
  };

  const handleReset = () => {
    setSupplierType(null);
    setFormData(null);
    localStorage.removeItem('supplierDraft');
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading... / 加載中...</p>
      </div>
    );
  }

  // Supplier Type Selection Screen
  if (!supplierType) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-light text-gray-900">
              Supplier Registration
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              供應商註冊 / Please select your supplier type
            </p>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-light text-gray-900 mb-6">
              Select Supplier Type / 選擇供應商類型
            </h2>

            <div className="space-y-4">
              <button
                onClick={() => setSupplierType('contractor')}
                className="w-full p-6 border-2 border-gray-300 hover:border-gray-900 hover:bg-gray-50 transition-all text-left group"
              >
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-900">
                  Contractor / 承包商
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Construction and contracting services
                  <br />
                  施工與承包服務
                </p>
              </button>

              <button
                onClick={() => setSupplierType('designer')}
                className="w-full p-6 border-2 border-gray-300 hover:border-gray-900 hover:bg-gray-50 transition-all text-left group"
              >
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-900">
                  Designer / 設計師
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Interior design and architectural services
                  <br />
                  室內設計與建築服務
                </p>
              </button>

              <button
                onClick={() => setSupplierType('material')}
                className="w-full p-6 border-2 border-gray-300 hover:border-gray-900 hover:bg-gray-50 transition-all group text-left"
              >
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-900">
                  Material/Furniture Supplier / 材料家具供應商
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Building materials and furniture supply
                  <br />
                  建材與家具供應
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Questionnaire Screen
  if (!formData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900">
            {isEditMode ? (
              <>
                {supplierType === 'contractor' && 'Edit Contractor Profile / 編輯承包商檔案'}
                {supplierType === 'designer' && 'Edit Designer Profile / 編輯設計師檔案'}
                {supplierType === 'material' && 'Edit Material Supplier Profile / 編輯材料供應商檔案'}
              </>
            ) : (
              <>
                {supplierType === 'contractor' && 'Contractor Registration / 承包商註冊'}
                {supplierType === 'designer' && 'Designer Registration / 設計師註冊'}
                {supplierType === 'material' &&
                  'Material/Furniture Supplier Registration / 材料家具供應商註冊'}
              </>
            )}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isEditMode ? 'Update your profile information / 更新您的檔案信息' : 'Complete your registration form / 完成您的註冊表格'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-gray-200 p-8">
          {/* Supplier Type Specific Questions */}
          {supplierType === 'contractor' && (
            <ContractorQuestionnaire
              data={formData as ContractorFormData}
              onChange={updateField}
            />
          )}

          {supplierType === 'designer' && (
            <DesignerQuestionnaire
              data={formData as DesignerFormData}
              onChange={updateField}
            />
          )}

          {supplierType === 'material' && (
            <MaterialSupplierQuestionnaire
              data={formData as MaterialSupplierFormData}
              onChange={updateField}
            />
          )}

          {/* Common Requirements for All Suppliers */}
          <CommonRequirements data={formData} onChange={updateField} />

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
            {!isEditMode && (
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Change Type / 更改類型
              </button>
            )}

            <div className={`flex gap-4 ${isEditMode ? 'ml-auto' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  alert('Draft saved automatically / 草稿自動保存');
                }}
                className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Save Draft / 保存草稿
              </button>

              <button
                type="submit"
                disabled={
                  !formData.guaranteeInfoTrue ||
                  !formData.acceptQualitySupervision ||
                  !formData.agreeInfoSharing
                }
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isEditMode ? 'Update / 更新' : 'Submit / 提交'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

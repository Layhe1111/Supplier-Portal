'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SupplierFormData,
  ContractorFormData,
  DesignerFormData,
  MaterialSupplierFormData,
} from '@/types/supplier';
import { supabase } from '@/lib/supabaseClient';
import ContractorQuestionnaire from '@/components/questionnaires/ContractorQuestionnaire';
import DesignerQuestionnaire from '@/components/questionnaires/DesignerQuestionnaire';
import MaterialSupplierQuestionnaire from '@/components/questionnaires/MaterialSupplierQuestionnaire';
import CommonRequirements from '@/components/questionnaires/CommonRequirements';

type NonBasicSupplierFormData =
  | ContractorFormData
  | DesignerFormData
  | MaterialSupplierFormData;

export default function SupplierRegistrationPage() {
  const router = useRouter();
  const [supplierType, setSupplierType] = useState<
    'contractor' | 'designer' | 'material' | null
  >(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);

  // Initialize form data based on supplier type
  const [formData, setFormData] = useState<NonBasicSupplierFormData | null>(null);

  // Check if user is logged in and load existing data if in edit mode
  useEffect(() => {
    const bootstrap = async () => {
      const normalizeSupplierData = (raw: any) => {
        if (!raw || typeof raw !== 'object') {
          return { normalized: raw as NonBasicSupplierFormData, changed: false };
        }

        const normalized = { ...raw } as Record<string, any>;
        let changed = false;

        if (!normalized.companyName && normalized.companyLegalName) {
          normalized.companyName = normalized.companyLegalName;
          changed = true;
        }

        if (normalized.companyName == null) {
          normalized.companyName = '';
          changed = true;
        }

        if (normalized.companyNameChinese == null) {
          normalized.companyNameChinese = '';
          changed = true;
        }

        if (typeof normalized.submissionDate === 'string' && normalized.submissionDate.includes('T')) {
          normalized.submissionDate = normalized.submissionDate.split('T')[0];
          changed = true;
        }

        return { normalized: normalized as NonBasicSupplierFormData, changed };
      };

      const localLoggedIn = localStorage.getItem('isLoggedIn');
      const { data } = await supabase.auth.getUser();
      if (!data.user && !localLoggedIn) {
        router.replace('/');
        return;
      }

      let serverSupplier: SupplierFormData | null = null;
      let serverSupplierId: string | null = null;

      if (data.user) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const res = await fetch('/api/suppliers/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const body = await res.json().catch(() => ({}));
            serverSupplier = body.supplier || null;
            serverSupplierId = body.supplierId || null;
          }
        }
      }

      if (serverSupplier) {
        if (serverSupplier.supplierType === 'basic') {
          router.replace('/register/basic');
          return;
        }
        const { normalized, changed } = normalizeSupplierData(serverSupplier);
        if (changed) {
          localStorage.setItem('supplierData', JSON.stringify(normalized));
        }
        setSupplierType(normalized.supplierType);
        setFormData(normalized);
        setIsEditMode(true);
        setSupplierId(serverSupplierId || 'local');
      } else {
        const local = localStorage.getItem('supplierData');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed.supplierType === 'basic') {
              router.replace('/register/basic');
              return;
            }
            if (parsed.supplierType) {
              const { normalized, changed } = normalizeSupplierData(parsed);
              if (changed) {
                localStorage.setItem('supplierData', JSON.stringify(normalized));
              }
              setSupplierType(normalized.supplierType);
              setFormData(normalized);
              setIsEditMode(true);
              setSupplierId('local');
            }
          } catch (err) {
            console.error('Failed to parse local supplier data', err);
          }
        }
      }

      setIsCheckingAuth(false);
    };
    bootstrap();
  }, [router]);

  // Initialize form data when supplier type is selected
  useEffect(() => {
    if (supplierType && !formData) {
      const commonFields = {
        businessRegistration: null,
        companyPhotos: null,
        hkBusinessRegistrationNumber: '',
        cnBusinessRegistrationNumber: '',
        cnUnifiedSocialCreditCode: '',
        guaranteeInfoTrue: false,
        acceptQualitySupervision: false,
        agreeInfoSharing: false,
        submitterName: '',
        submitterPosition: '',
        submitterPhoneCode: '+852',
        submitterPhone: '',
        submitterEmail: '',
        contactFax: '',
        submissionDate: new Date().toISOString().split('T')[0],
      };

      if (supplierType === 'contractor') {
        const contractorData: ContractorFormData = {
          supplierType: 'contractor',
          ...commonFields,
          companyName: '',
          companyNameChinese: '',
          yearEstablished: '',
          registeredCapital: '',
          numberOfEmployees: '',
          country: '',
          officeAddress: '',
          businessDescription: '',
          hkWorkEligibleEmployees: '',
          companySupplementFile: null,
          companySupplementLink: '',
          constructionGrade: '',
          licenseNumber: '',
          certificateUpload: null,
          isocertifications: [],
          isoCertificateUploads: {},
          otherCertifications: [
            {
              id: `${Date.now()}-cert`,
              name: '',
              file: null,
            },
          ],
          projectTypes: [],
          projectHighlights: [],
          annualConstructionCapacity: '',
          maxConcurrentProjects: '',
          largestProjectValue: '',
          projectManagers: [],
          organizationChart: null,
          hasSafetyOfficer: '',
          numberOfSafetyOfficers: '',
          hasConstructionManager: '',
          numberOfConstructionManagers: '',
          hasMepLead: '',
          numberOfMepLeads: '',
          cnHkProjectCompliance: false,
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
          companyName: '',
          companyNameChinese: '',
          yearEstablished: '',
          registeredCapital: '',
          country: '',
          officeAddress: '',
          businessDescription: '',
          hkWorkEligibleEmployees: '',
          designAwards: [''],
          designTeamSize: '',
          feeStructure: [],
          designHighlights: [],
          companySupplementFile: null,
          companySupplementLink: '',
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
          dbIsocertifications: [],
          dbIsoCertificateUploads: {},
          dbOtherCertifications: [
            {
              id: `${Date.now()}-cert`,
              name: '',
              file: null,
            },
          ],
          dbProjectTypes: [],
          dbProjectHighlights: [],
          dbAnnualConstructionCapacity: '',
          dbMaxConcurrentProjects: '',
          dbLargestProjectValue: '',
          dbProjectManagers: [],
          dbOrganizationChart: null,
          dbHasSafetyOfficer: '',
          dbNumberOfSafetyOfficers: '',
          dbHasConstructionManager: '',
          dbNumberOfConstructionManagers: '',
          dbHasMepLead: '',
          dbNumberOfMepLeads: '',
          dbCnHkProjectCompliance: false,
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
          companyName: '',
          companyNameChinese: '',
          yearEstablished: '',
          registeredCapital: '',
          country: '',
          officeAddress: '',
          businessDescription: '',
          hkWorkEligibleEmployees: '',
          companyType: [],
          representedBrands: [''],
          warehouses: [{ address: '', capacity: '' }],
          companySupplementFile: null,
          companySupplementLink: '',
          products: [],
          projectHighlights: [],
          sampleProvided: '',
          sampleCost: '',
          sampleDeliveryTime: '',
          freeShippingToHK: '',
        };
        setFormData(materialData);
      }
    }
  }, [supplierType, formData]);

  const updateField = <T extends NonBasicSupplierFormData>(
    field: keyof T,
    value: any
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const upsertSupplier = async (status: 'draft' | 'submitted') => {
    if (!formData || !supplierType) return null;

    const payload: SupplierFormData = formData;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error('Please sign in to save to database / 請先登入再提交資料');
    }

    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        supplierType,
        status,
        data: payload,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to save supplier');
    }

    const body = await res.json().catch(() => ({}));
    const savedId = body.supplierId || supplierId || `local-${Date.now()}`;
    localStorage.setItem('supplierData', JSON.stringify(payload));
    localStorage.setItem('isLoggedIn', 'true');
    setSupplierId(savedId);
    return savedId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData) return;

    if (!formData.companyName?.trim() && !formData.companyNameChinese?.trim()) {
      setError('Please provide a company name in English or Chinese / 請至少填寫公司英文名或中文名');
      return;
    }

    if (
      !formData.guaranteeInfoTrue ||
      !formData.acceptQualitySupervision ||
      !formData.agreeInfoSharing
    ) {
      setError('Please accept all quality commitments / 請接受所有質量承諾');
      return;
    }

    setIsSubmitting(true);
    try {
      await upsertSupplier('submitted');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData) return;
    setError('');
    setIsSubmitting(true);
    try {
      await upsertSupplier('draft');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSupplierType(null);
    setFormData(null);
    setSupplierId(null);
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
            <h2 className="text-xl font-light text-gray-900 mb-2">
              Select Supplier Type / 選擇供應商類型
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Which of the below options best describes your organization? / 以下哪個最符合你的公司？
            </p>

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
                  Interior and architectural design services
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

              <button
                type="button"
                onClick={() => router.push('/register/basic')}
                className="w-full p-6 border-2 border-gray-300 hover:border-gray-900 hover:bg-gray-50 transition-all text-left group"
              >
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-900">
                  Basic Supplier / 基礎供應商
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Basic company and contact information
                  <br />
                  基礎公司與聯絡信息
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
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Draft / 保存草稿'}
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !formData.guaranteeInfoTrue ||
                  !formData.acceptQualitySupervision ||
                  !formData.agreeInfoSharing
                }
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : isEditMode ? 'Update / 更新' : 'Submit / 提交'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 mt-4">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

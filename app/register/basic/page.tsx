'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import FormSection from '@/components/FormSection';
import FileUpload from '@/components/FileUpload';
import { BasicSupplierFormData } from '@/types/supplier';
import { supabase } from '@/lib/supabaseClient';
import { validateLocalPhone } from '@/lib/phoneValidation';
import { validateOptionalUrl } from '@/lib/urlValidation';
import { validateEmail } from '@/lib/emailValidation';
import { useUnsavedChanges } from '@/components/UnsavedChangesProvider';
import { useToast } from '@/components/ToastProvider';

const PHONE_CODE_OPTIONS = [
  '+852',
  '+86',
  '+853',
  '+886',
  '+65',
  '+60',
  '+81',
  '+82',
  '+44',
  '+1',
  '+61',
  '+971',
];

const COUNTRY_OPTIONS = [
  { value: 'Hong Kong', label: 'Hong Kong 香港' },
  { value: 'China', label: 'China 中國' },
  { value: 'Macau', label: 'Macau 澳門' },
  { value: 'Taiwan', label: 'Taiwan 台灣' },
  { value: 'Singapore', label: 'Singapore 新加坡' },
  { value: 'Malaysia', label: 'Malaysia 馬來西亞' },
  { value: 'Japan', label: 'Japan 日本' },
  { value: 'South Korea', label: 'South Korea 韓國' },
  { value: 'Thailand', label: 'Thailand 泰國' },
  { value: 'Vietnam', label: 'Vietnam 越南' },
  { value: 'Philippines', label: 'Philippines 菲律賓' },
  { value: 'Indonesia', label: 'Indonesia 印尼' },
  { value: 'India', label: 'India 印度' },
  { value: 'United Arab Emirates', label: 'UAE 阿聯酋' },
  { value: 'United Kingdom', label: 'United Kingdom 英國' },
  { value: 'United States', label: 'United States 美國' },
  { value: 'Canada', label: 'Canada 加拿大' },
  { value: 'Australia', label: 'Australia 澳洲' },
  { value: 'Germany', label: 'Germany 德國' },
  { value: 'France', label: 'France 法國' },
];

export default function BasicSupplierRegistrationPage() {
  const router = useRouter();
  const toast = useToast();
  const didBootstrapRef = useRef(false);
  const changeCounterRef = useRef(0);
  const { setDirty, registerSaveHandler } = useUnsavedChanges();
  const [formData, setFormData] = useState<BasicSupplierFormData>({
    supplierType: 'basic',
    companyName: '',
    companyNameChinese: '',
    country: '',
    officeAddress: '',
    businessType: '',
    submitterName: '',
    submitterPosition: '',
    submitterPhone: '',
    submitterPhoneCode: '+852',
    submitterEmail: '',
    contactFaxCode: '+852',
    contactFax: '',
    businessDescription: '',
    companySupplementLink: '',
    companyLogo: null,
    submissionDate: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError('');
  }, [error, toast]);

  // Check if user is logged in (Supabase auth) and load any existing local draft
  useEffect(() => {
    const bootstrap = async () => {
      if (didBootstrapRef.current) return;
      didBootstrapRef.current = true;
      const normalizeBasicSupplierData = (raw: any) => {
        if (!raw || typeof raw !== 'object') {
          return { normalized: raw as BasicSupplierFormData, changed: false };
        }

        const normalized = { ...raw } as Record<string, any>;
        let changed = false;

        if (!normalized.officeAddress && normalized.companyAddress) {
          normalized.officeAddress = normalized.companyAddress;
          changed = true;
        }

        if (!normalized.submitterPhone && normalized.contactPhone) {
          normalized.submitterPhone = normalized.contactPhone;
          changed = true;
        }

        if (!normalized.submitterPhoneCode && normalized.contactPhoneCode) {
          normalized.submitterPhoneCode = normalized.contactPhoneCode;
          changed = true;
        }

        if (!normalized.submitterEmail && normalized.contactEmail) {
          normalized.submitterEmail = normalized.contactEmail;
          changed = true;
        }

        if (!normalized.companySupplementLink && normalized.companyWebsite) {
          normalized.companySupplementLink = normalized.companyWebsite;
          changed = true;
        }

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

        if (normalized.officeAddress == null) {
          normalized.officeAddress = '';
          changed = true;
        }

        if (normalized.country == null) {
          normalized.country = '';
          changed = true;
        }

        if (normalized.businessType == null) {
          normalized.businessType = '';
          changed = true;
        }

        if (normalized.submitterName == null) {
          normalized.submitterName = '';
          changed = true;
        }

        if (normalized.submitterPosition == null) {
          normalized.submitterPosition = '';
          changed = true;
        }

        if (normalized.submitterPhone == null) {
          normalized.submitterPhone = '';
          changed = true;
        }

        if (normalized.submitterPhoneCode == null) {
          normalized.submitterPhoneCode = '+852';
          changed = true;
        }

        if (normalized.submitterEmail == null) {
          normalized.submitterEmail = '';
          changed = true;
        }

        if (normalized.contactFaxCode == null) {
          normalized.contactFaxCode = '+852';
          changed = true;
        }

        if (typeof normalized.contactFax === 'string' && normalized.contactFax.trim()) {
          const match = normalized.contactFax.trim().match(/^(\+\d+)\s*(.*)$/);
          if (match) {
            normalized.contactFaxCode = match[1];
            normalized.contactFax = match[2].trim();
            changed = true;
          }
        }

        if (typeof normalized.submissionDate === 'string' && normalized.submissionDate.includes('T')) {
          normalized.submissionDate = normalized.submissionDate.split('T')[0];
          changed = true;
        }

        if (!normalized.submissionDate) {
          normalized.submissionDate = new Date().toISOString().split('T')[0];
          changed = true;
        }

        return { normalized: normalized as BasicSupplierFormData, changed };
      };

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) {
        router.replace('/');
        return;
      }

      let serverSupplier: BasicSupplierFormData | null = null;
      const token = session.access_token;
      if (token) {
        const res = await fetch('/api/suppliers/me?type=basic', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          serverSupplier = body.supplier || null;
        }
      }

      if (serverSupplier) {
        const { normalized } = normalizeBasicSupplierData(serverSupplier);
        setFormData(normalized as BasicSupplierFormData);
        changeCounterRef.current = 0;
        setDirty(false);
      }
    };
    bootstrap();
  }, [router, setDirty]);

  const handleInputChange = (field: keyof BasicSupplierFormData, value: string | File | null) => {
    changeCounterRef.current += 1;
    setDirty(true);
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveDraftForNavigation = useCallback(async () => {
    const saveVersion = changeCounterRef.current;
    setError('');
    setIsSubmitting(true);
    try {
      if (formData.submitterEmail?.trim()) {
        const emailCheck = validateEmail(formData.submitterEmail, 'Email / 電郵');
        if (!emailCheck.ok) {
          setError(emailCheck.error || 'Invalid email');
          return false;
        }
      }

      if (formData.companySupplementLink?.trim()) {
        const companyLinkCheck = validateOptionalUrl(
          formData.companySupplementLink,
          'Company website / 公司網站'
        );
        if (!companyLinkCheck.ok) {
          setError(companyLinkCheck.error || 'Invalid website URL');
          return false;
        }
      }

      if (formData.submitterPhone?.trim()) {
        const phoneCheck = validateLocalPhone(
          formData.submitterPhoneCode || '+852',
          formData.submitterPhone || ''
        );
        if (!phoneCheck.ok) {
          setError(phoneCheck.error || 'Invalid phone number');
          return false;
        }
      }

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
          supplierType: 'basic',
          status: 'draft',
          data: formData,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save supplier');
      }

      if (changeCounterRef.current === saveVersion) {
        setDirty(false);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, setDirty]);

  useEffect(() => {
    registerSaveHandler(saveDraftForNavigation);
    return () => {
      registerSaveHandler(null);
      setDirty(false);
    };
  }, [registerSaveHandler, saveDraftForNavigation, setDirty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      !formData.country ||
      !formData.officeAddress ||
      !formData.businessType ||
      !formData.submitterName ||
      !formData.submitterPosition ||
      !formData.submitterPhone ||
      !formData.submitterEmail ||
      !formData.submissionDate
    ) {
      setError('Please fill in all required fields / 請填寫所有必填項');
      return;
    }

    if (!formData.companyName?.trim() && !formData.companyNameChinese?.trim()) {
      setError('Please provide a company name in English or Chinese / 請至少填寫公司英文名或中文名');
      return;
    }

    const emailCheck = validateEmail(formData.submitterEmail, 'Email / 電郵');
    if (!emailCheck.ok) {
      setError(emailCheck.error || 'Invalid email');
      return;
    }

    const companyLinkCheck = validateOptionalUrl(
      formData.companySupplementLink,
      'Company website / 公司網站'
    );
    if (!companyLinkCheck.ok) {
      setError(companyLinkCheck.error || 'Invalid website URL');
      return;
    }

    const phoneCheck = validateLocalPhone(
      formData.submitterPhoneCode || '+852',
      formData.submitterPhone || ''
    );
    if (!phoneCheck.ok) {
      setError(phoneCheck.error || 'Invalid phone number');
      return;
    }

    setIsSubmitting(true);

    try {
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
          supplierType: 'basic',
          status: 'submitted',
          data: formData,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save supplier');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-gray-900">
            Supplier Registration
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            供應商註冊
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <FormSection title="Company Information / 公司信息">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name */}
              <div className="md:col-span-2">
                <FormInput
                  label="Company English Name / 公司英文名"
                  name="companyName"
                  value={formData.companyName}
                  onChange={(value) => handleInputChange('companyName', value)}
                  placeholder="Enter company name"
                />
              </div>

              {/* Company Chinese Name */}
              <div className="md:col-span-2">
                <FormInput
                  label="Company Chinese Name / 公司中文名"
                  name="companyNameChinese"
                  value={formData.companyNameChinese || ''}
                  onChange={(value) => handleInputChange('companyNameChinese', value)}
                  placeholder="請輸入公司中文名稱"
                />
              </div>

              {/* Country */}
              <div>
                <FormSelect
                  label="Country / 國家和地區"
                  name="country"
                  required
                  value={formData.country}
                  onChange={(v) => handleInputChange('country', v as string)}
                  options={COUNTRY_OPTIONS}
                />
              </div>

              {/* Business Type */}
              <div>
                <FormInput
                  label="Business Type / 業務類型"
                  name="businessType"
                  required
                  value={formData.businessType}
                  onChange={(value) => handleInputChange('businessType', value)}
                  placeholder="e.g., Construction, Design, Materials"
                />
              </div>

              {/* Company Address */}
              <div className="md:col-span-2">
                <FormInput
                  label="Office Address / 辦公地址"
                  name="officeAddress"
                  required
                  value={formData.officeAddress}
                  onChange={(value) => handleInputChange('officeAddress', value)}
                  placeholder="Enter full company address"
                />
              </div>

              {/* Business Description (Optional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-light text-gray-700 mb-1">
                  Business Description / 公司或業務簡介{' '}
                  <span className="text-gray-400">(Optional / 選填)</span>
                </label>
                <textarea
                  value={formData.businessDescription || ''}
                  onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                  rows={4}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                  placeholder="Brief introduction of your company and business"
                />
              </div>

              {/* Company Website (Optional) */}
              <div className="md:col-span-2">
                <FormInput
                  label="Or enter company website / 或輸入公司網站"
                  name="companySupplementLink"
                  value={formData.companySupplementLink || ''}
                  onChange={(value) => handleInputChange('companySupplementLink', value)}
                  placeholder="https://..."
                  type="url"
                />
                <p className="mt-1 text-xs text-gray-500">Optional / 選填</p>
              </div>

              {/* Company Logo (Optional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-light text-gray-700 mb-1">
                  Company Logo / 公司Logo{' '}
                  <span className="text-gray-400">(Optional / 選填)</span>
                </label>
                <FileUpload
                  accept="image/*"
                  onChange={(filePath) => handleInputChange('companyLogo', filePath)}
                  label="Upload company logo (PNG, JPG, max 5MB)"
                  name="companyLogo"
                  value={formData.companyLogo}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Contact Information / 聯絡人資料">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Contact Person / 聯絡人"
                name="submitterName"
                required
                value={formData.submitterName}
                onChange={(value) => handleInputChange('submitterName', value)}
              />

              <FormInput
                label="Position / 職位"
                name="submitterPosition"
                required
                value={formData.submitterPosition}
                onChange={(value) => handleInputChange('submitterPosition', value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-1">
                  Contact Number / 聯繫電話 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.submitterPhoneCode}
                    onChange={(e) => handleInputChange('submitterPhoneCode', e.target.value)}
                    className="w-28 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    {PHONE_CODE_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={formData.submitterPhone}
                    onChange={(e) => handleInputChange('submitterPhone', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="e.g., 91234567"
                  />
                </div>
              </div>

              <FormInput
                label="Email / 電郵"
                name="submitterEmail"
                required
                type="email"
                value={formData.submitterEmail}
                onChange={(value) => handleInputChange('submitterEmail', value)}
                placeholder="contact@company.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Submission Date / 提交日期"
                name="submissionDate"
                required
                type="date"
                value={formData.submissionDate}
                onChange={(value) => handleInputChange('submissionDate', value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-1">
                  Contact Fax / 聯絡傳真
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.contactFaxCode || '+852'}
                    onChange={(e) => handleInputChange('contactFaxCode', e.target.value)}
                    className="w-28 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    {PHONE_CODE_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={formData.contactFax || ''}
                    onChange={(e) => handleInputChange('contactFax', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                    placeholder="Enter fax number"
                  />
                </div>
              </div>
            </div>
          </FormSection>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/register/supplier')}
              className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
            >
              Cancel / 取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 border border-transparent text-sm font-light bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit / 提交'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

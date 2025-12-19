'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import FormSection from '@/components/FormSection';
import FileUpload from '@/components/FileUpload';
import { BasicSupplierFormData } from '@/types/supplier';

const COUNTRY_CODES = [
  { code: '+86', name: '中國 China', flag: '🇨🇳' },
  { code: '+852', name: '香港 Hong Kong', flag: '🇭🇰' },
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
  const [formData, setFormData] = useState<BasicSupplierFormData>({
    supplierType: 'basic',
    companyName: '',
    companyNameChinese: '',
    country: '',
    companyAddress: '',
    businessType: '',
    contactPhone: '',
    contactPhoneCode: '+86',
    contactEmail: '',
    contactFax: '',
    businessDescription: '',
    companyWebsite: '',
    companyLogo: null,
    submissionDate: new Date().toISOString(),
  });

  // Check if user is logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
  }, [router]);

  const handleInputChange = (field: keyof BasicSupplierFormData, value: string | File | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Check if Chinese name is required based on country
  const requiresChineseName = ['Hong Kong', 'China', 'Macau', 'Taiwan', 'Singapore'].includes(formData.country);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.companyName ||
      !formData.country ||
      !formData.companyAddress ||
      !formData.businessType ||
      !formData.contactPhone ||
      !formData.contactEmail ||
      !formData.contactFax
    ) {
      alert('Please fill in all required fields / 請填寫所有必填項');
      return;
    }

    // Validate Chinese name if required
    if (requiresChineseName && !formData.companyNameChinese) {
      alert('Please fill in the company Chinese name / 請填寫公司中文名');
      return;
    }

    // Save supplier data
    localStorage.setItem('supplierData', JSON.stringify(formData));
    localStorage.setItem('isLoggedIn', 'true');

    alert('Registration successful! / 註冊成功！');
    router.push('/dashboard');
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
                  required
                  value={formData.companyName}
                  onChange={(value) => handleInputChange('companyName', value)}
                  placeholder="Enter company name"
                />
              </div>

              {/* Company Chinese Name (conditional) */}
              {requiresChineseName && (
                <div className="md:col-span-2">
                  <FormInput
                    label="Company Chinese Name / 公司中文名"
                    required
                    value={formData.companyNameChinese || ''}
                    onChange={(value) => handleInputChange('companyNameChinese', value)}
                    placeholder="請輸入公司中文名稱"
                  />
                </div>
              )}

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
                  required
                  value={formData.businessType}
                  onChange={(value) => handleInputChange('businessType', value)}
                  placeholder="e.g., Construction, Design, Materials"
                />
              </div>

              {/* Company Address */}
              <div className="md:col-span-2">
                <FormInput
                  label="Company Address / 公司地址"
                  required
                  value={formData.companyAddress}
                  onChange={(value) => handleInputChange('companyAddress', value)}
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
                  label="Company Website / 公司網址"
                  value={formData.companyWebsite || ''}
                  onChange={(value) => handleInputChange('companyWebsite', value)}
                  placeholder="https://www.example.com"
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
                  onChange={(file) => handleInputChange('companyLogo', file)}
                  label="Upload company logo (PNG, JPG, max 5MB)"
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Contact Information / 聯絡信息">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-light text-gray-700 mb-1">
                  Contact Phone / 聯絡電話 <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <select
                    value={formData.contactPhoneCode}
                    onChange={(e) => handleInputChange('contactPhoneCode', e.target.value)}
                    className="appearance-none px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="appearance-none relative block flex-1 px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                    placeholder="1234 5678"
                  />
                </div>
              </div>

              {/* Contact Email */}
              <div>
                <FormInput
                  label="Contact Email / 聯絡電郵"
                  required
                  type="email"
                  value={formData.contactEmail}
                  onChange={(value) => handleInputChange('contactEmail', value)}
                  placeholder="contact@company.com"
                />
              </div>

              {/* Contact Fax */}
              <div className="md:col-span-2">
                <FormInput
                  label="Contact Fax / 聯絡傳真"
                  required
                  value={formData.contactFax}
                  onChange={(value) => handleInputChange('contactFax', value)}
                  placeholder="Enter fax number"
                />
              </div>
            </div>
          </FormSection>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
            >
              Cancel / 取消
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 border border-transparent text-sm font-light bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
            >
              Submit / 提交
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

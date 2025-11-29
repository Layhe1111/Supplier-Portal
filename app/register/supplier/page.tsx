'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FormInput from '@/components/FormInput';
import FormCheckbox from '@/components/FormCheckbox';
import FileUpload from '@/components/FileUpload';
import FormSection from '@/components/FormSection';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  spec: string;
  material: string;
  unitPrice: string;
  moq: string;
  leadTime: string;
  description: string;
  image: File | null;
}

interface SupplierFormData {
  // Company Information
  companyName: string;
  businessLicense: string;
  yearEstablished: string;
  registeredCapital: string;
  companyAddress: string;
  warehouseAddress: string;

  // Contact Information
  contactName: string;
  contactPosition: string;
  contactPhone: string;
  contactEmail: string;

  // Business Information
  businessScope: string;
  representedBrands: string;

  // Documents
  businessRegistration: File | null;
  companyPhotos: File | null;

  // Products
  products: Product[];

  // Agreement
  agreeToTerms: boolean;
}

export default function SupplierRegistrationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SupplierFormData>({
    companyName: '',
    businessLicense: '',
    yearEstablished: '',
    registeredCapital: '',
    companyAddress: '',
    warehouseAddress: '',
    contactName: '',
    contactPosition: '',
    contactPhone: '',
    contactEmail: '',
    businessScope: '',
    representedBrands: '',
    businessRegistration: null,
    companyPhotos: null,
    products: [],
    agreeToTerms: false,
  });

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('supplierDraft', JSON.stringify({
        ...formData,
        businessRegistration: null,
        companyPhotos: null,
        products: formData.products.map((p) => ({ ...p, image: null })),
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('supplierDraft');
    if (draft) {
      const parsed = JSON.parse(draft);
      setFormData((prev) => ({ ...prev, ...parsed }));
    }
  }, []);

  const updateField = (field: keyof SupplierFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      sku: '',
      name: '',
      category: '',
      brand: '',
      spec: '',
      material: '',
      unitPrice: '',
      moq: '',
      leadTime: '',
      description: '',
      image: null,
    };
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, newProduct],
    }));
  };

  const updateProduct = (id: string, field: keyof Product, value: any) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  };

  const removeProduct = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.setItem('supplierData', JSON.stringify(formData));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.removeItem('supplierDraft');

    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900">
            Supplier Registration
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            供應商註冊 / Complete your supplier profile and add your products
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-gray-200 p-8">

          {/* Company Information */}
          <FormSection title="Company Information / 公司信息">
            <FormInput
              label="Company Name / 公司名稱"
              name="companyName"
              required
              value={formData.companyName}
              onChange={(v) => updateField('companyName', v)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Business License Number / 營業執照號"
                name="businessLicense"
                required
                value={formData.businessLicense}
                onChange={(v) => updateField('businessLicense', v)}
              />

              <FormInput
                label="Year Established / 成立年份"
                name="yearEstablished"
                type="number"
                required
                value={formData.yearEstablished}
                onChange={(v) => updateField('yearEstablished', v)}
              />
            </div>

            <FormInput
              label="Registered Capital / 註冊資本"
              name="registeredCapital"
              required
              placeholder="e.g., HKD 1,000,000"
              value={formData.registeredCapital}
              onChange={(v) => updateField('registeredCapital', v)}
            />

            <FormInput
              label="Company Address / 公司地址"
              name="companyAddress"
              required
              value={formData.companyAddress}
              onChange={(v) => updateField('companyAddress', v)}
            />

            <FormInput
              label="Warehouse Address / 倉庫地址"
              name="warehouseAddress"
              value={formData.warehouseAddress}
              onChange={(v) => updateField('warehouseAddress', v)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload
                label="Business Registration Document / 營業執照"
                name="businessRegistration"
                required
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(file) => updateField('businessRegistration', file)}
              />

              <FileUpload
                label="Company Photos / 公司照片"
                name="companyPhotos"
                accept=".jpg,.jpeg,.png"
                onChange={(file) => updateField('companyPhotos', file)}
              />
            </div>
          </FormSection>

          {/* Contact Information */}
          <FormSection title="Contact Information / 聯繫信息">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Contact Name / 聯繫人姓名"
                name="contactName"
                required
                value={formData.contactName}
                onChange={(v) => updateField('contactName', v)}
              />

              <FormInput
                label="Position / 職位"
                name="contactPosition"
                required
                value={formData.contactPosition}
                onChange={(v) => updateField('contactPosition', v)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Contact Phone / 聯繫電話"
                name="contactPhone"
                type="tel"
                required
                value={formData.contactPhone}
                onChange={(v) => updateField('contactPhone', v)}
              />

              <FormInput
                label="Contact Email / 電郵"
                name="contactEmail"
                type="email"
                required
                value={formData.contactEmail}
                onChange={(v) => updateField('contactEmail', v)}
              />
            </div>
          </FormSection>

          {/* Business Information */}
          <FormSection title="Business Information / 業務信息">
            <FormInput
              label="Business Scope / 經營範圍"
              name="businessScope"
              required
              placeholder="e.g., Furniture, Building Materials, Home Decor"
              value={formData.businessScope}
              onChange={(v) => updateField('businessScope', v)}
            />

            <FormInput
              label="Represented Brands / 代理品牌"
              name="representedBrands"
              placeholder="e.g., Brand A, Brand B, Brand C"
              value={formData.representedBrands}
              onChange={(v) => updateField('representedBrands', v)}
            />
          </FormSection>

          {/* Product Management */}
          <FormSection title="Product Catalog / 產品目錄">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Add your products below. You can add more products later from your dashboard.
                <br />
                在下方添加您的產品。您可以稍後從儀表板添加更多產品。
              </p>
              <button
                type="button"
                onClick={addProduct}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
              >
                + Add Product / 添加產品
              </button>
            </div>

            {formData.products.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="mt-4 text-sm text-gray-500">
                  No products added yet
                  <br />
                  尚未添加產品
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.products.map((product, index) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 p-6 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-base font-medium text-gray-900">
                        Product #{index + 1} / 產品 #{index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-light"
                      >
                        Remove / 刪除
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormInput
                          label="SKU / SKU編碼"
                          name={`sku-${product.id}`}
                          required
                          value={product.sku}
                          onChange={(v) => updateProduct(product.id, 'sku', v)}
                        />

                        <FormInput
                          label="Product Name / 產品名稱"
                          name={`name-${product.id}`}
                          required
                          value={product.name}
                          onChange={(v) => updateProduct(product.id, 'name', v)}
                        />

                        <FormInput
                          label="Category / 類別"
                          name={`category-${product.id}`}
                          required
                          placeholder="e.g., Furniture, Lighting"
                          value={product.category}
                          onChange={(v) => updateProduct(product.id, 'category', v)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                          label="Brand / 品牌"
                          name={`brand-${product.id}`}
                          required
                          value={product.brand}
                          onChange={(v) => updateProduct(product.id, 'brand', v)}
                        />

                        <FormInput
                          label="Material / 材質"
                          name={`material-${product.id}`}
                          required
                          value={product.material}
                          onChange={(v) => updateProduct(product.id, 'material', v)}
                        />
                      </div>

                      <FormInput
                        label="Specification / 規格"
                        name={`spec-${product.id}`}
                        required
                        placeholder="e.g., 120cm x 60cm x 75cm"
                        value={product.spec}
                        onChange={(v) => updateProduct(product.id, 'spec', v)}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormInput
                          label="Unit Price (HKD) / 單價"
                          name={`unitPrice-${product.id}`}
                          type="number"
                          required
                          value={product.unitPrice}
                          onChange={(v) => updateProduct(product.id, 'unitPrice', v)}
                        />

                        <FormInput
                          label="MOQ / 最小起訂量"
                          name={`moq-${product.id}`}
                          type="number"
                          required
                          value={product.moq}
                          onChange={(v) => updateProduct(product.id, 'moq', v)}
                        />

                        <FormInput
                          label="Lead Time (days) / 交貨周期"
                          name={`leadTime-${product.id}`}
                          type="number"
                          required
                          value={product.leadTime}
                          onChange={(v) => updateProduct(product.id, 'leadTime', v)}
                        />
                      </div>

                      <div>
                        <label htmlFor={`description-${product.id}`} className="block text-sm font-light text-gray-700 mb-1">
                          Description / 產品描述
                        </label>
                        <textarea
                          id={`description-${product.id}`}
                          name={`description-${product.id}`}
                          rows={3}
                          value={product.description}
                          onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                          className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                          placeholder="Product description, features, usage notes..."
                        />
                      </div>

                      <FileUpload
                        label="Product Image / 產品圖片"
                        name={`image-${product.id}`}
                        accept=".jpg,.jpeg,.png"
                        onChange={(file) => updateProduct(product.id, 'image', file)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          {/* Terms Agreement */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <FormCheckbox
              label="I confirm that all information provided is accurate and I agree to the terms of service / 我確認所提供的所有信息準確無誤，並同意服務條款"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={(v) => updateField('agreeToTerms', v)}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back / 返回
            </button>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  alert('Draft saved / 草稿已保存');
                }}
                className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Save Draft / 保存草稿
              </button>

              <button
                type="submit"
                disabled={!formData.agreeToTerms}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Submit / 提交
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

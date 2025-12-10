import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FileUpload from '../FileUpload';
import MultiImageUpload from '../MultiImageUpload';
import { MaterialSupplierFormData, Product, DesignerProject } from '@/types/supplier';

interface MaterialSupplierQuestionnaireProps {
  data: MaterialSupplierFormData;
  onChange: <K extends keyof MaterialSupplierFormData>(
    field: K,
    value: MaterialSupplierFormData[K]
  ) => void;
}

export default function MaterialSupplierQuestionnaire({
  data,
  onChange,
}: MaterialSupplierQuestionnaireProps) {
  const countryOptions = [
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
  const companyTypeOptions = [
    { value: 'manufacturer', label: 'Manufacturer 生產商' },
    { value: 'agent', label: 'Agent 代理商' },
    { value: 'distributor', label: 'Distributor 經銷商' },
  ];

  const projectTypeOptions = [
    { value: 'residential', label: 'Residential 住宅' },
    { value: 'commercial', label: 'Commercial 商業' },
    { value: 'office', label: 'Office 辦公' },
    { value: 'hotel', label: 'Hotel 酒店' },
    { value: 'medical', label: 'Medical 醫療' },
    { value: 'education', label: 'Education 教育' },
    { value: 'industrial', label: 'Industrial 工業' },
    { value: 'other', label: 'Other 其他' },
  ];

  // Initialize representedBrands if it's a string (for backward compatibility)
  if (typeof data.representedBrands === 'string') {
    onChange('representedBrands', data.representedBrands ? [data.representedBrands] : ['']);
  } else if (!data.representedBrands || data.representedBrands.length === 0) {
    onChange('representedBrands', ['']);
  }

  // Brand management functions
  const addBrand = () => {
    onChange('representedBrands', [...(data.representedBrands || ['']), '']);
  };

  const updateBrand = (index: number, value: string) => {
    const updated = [...(data.representedBrands || [''])];
    updated[index] = value;
    onChange('representedBrands', updated);
  };

  const removeBrand = (index: number) => {
    const updated = (data.representedBrands || ['']).filter((_, i) => i !== index);
    // Ensure at least one brand field remains
    onChange('representedBrands', updated.length > 0 ? updated : ['']);
  };

  // Initialize warehouses if undefined (for backward compatibility)
  if (!data.warehouses) {
    onChange('warehouses', []);
  }

  // Warehouse management functions
  const addWarehouse = () => {
    onChange('warehouses', [...(data.warehouses || []), { address: '', capacity: '' }]);
  };

  const updateWarehouse = (index: number, field: 'address' | 'capacity', value: string) => {
    const updated = [...(data.warehouses || [])];
    updated[index] = { ...updated[index], [field]: value };
    onChange('warehouses', updated);
  };

  const removeWarehouse = (index: number) => {
    const updated = (data.warehouses || []).filter((_, i) => i !== index);
    onChange('warehouses', updated);
  };

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      sku: '',
      productName: '',
      category: '',
      brand: '',
      series: '',
      spec: '',
      material: '',
      unitPrice: '',
      moq: '',
      origin: '',
      leadTime: '',
      currentStock: '',
      photos: [],
      specificationFile: null,
      specificationLink: '',
      model3D: null,
    };
    onChange('products', [...data.products, newProduct]);
  };

  const updateProduct = (id: string, field: keyof Product, value: any) => {
    const updatedProducts = data.products.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );
    onChange('products', updatedProducts);
  };

  const removeProduct = (id: string) => {
    const updatedProducts = data.products.filter((p) => p.id !== id);
    onChange('products', updatedProducts);
  };

  const isHongKong = data.country === 'Hong Kong';
  const isChina = data.country === 'China';

  // Project Highlights management functions
  const addProjectHighlight = () => {
    const newProject: DesignerProject = {
      id: Date.now().toString(),
      projectName: '',
      year: '',
      address: '',
      area: '',
      renovationType: '',
      projectTypes: [],
      projectHighlight: false,
      photos: [],
    };
    onChange('projectHighlights', [...(data.projectHighlights || []), newProject]);
  };

  const updateProjectHighlight = (
    projectId: string,
    field: keyof DesignerProject,
    value: any
  ) => {
    const updatedProjects = (data.projectHighlights || []).map((project) =>
      project.id === projectId ? { ...project, [field]: value } : project
    );
    onChange('projectHighlights', updatedProjects);
  };

  const removeProjectHighlight = (projectId: string) => {
    const updatedProjects = (data.projectHighlights || []).filter(
      (project) => project.id !== projectId
    );
    onChange('projectHighlights', updatedProjects);
  };

  return (
    <>
      {/* Section 1: Supplier Basic Information */}
      <FormSection title="Section 1: Supplier Basic Information / 供應商基本信息">
        <FormInput
          label="Entity Name / 公司全稱"
          name="companyLegalName"
          required
          value={data.companyLegalName}
          onChange={(v) => onChange('companyLegalName', v)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Year of Incorporation / 成立年份"
            name="yearEstablished"
            type="number"
            required
            value={data.yearEstablished}
            onChange={(v) => onChange('yearEstablished', v)}
          />

          <FormInput
            label="Registered Capital / 註冊資本"
            name="registeredCapital"
            required={!isHongKong}
            placeholder="e.g., HKD 1,000,000"
            value={data.registeredCapital}
            onChange={(v) => onChange('registeredCapital', v)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSelect
            label="Country / 國家和地区"
            name="country"
            required
            value={data.country}
            onChange={(v) => onChange('country', v as string)}
            options={countryOptions}
          />

          <FormInput
            label="Office Address / 辦公地址"
            name="officeAddress"
            required
            value={data.officeAddress}
            onChange={(v) => onChange('officeAddress', v)}
          />
        </div>

        {isHongKong && (
          <FormInput
            label="Business Registration Number / 商業登記號"
            name="hkBusinessRegistrationNumber"
            required
            value={data.hkBusinessRegistrationNumber}
            onChange={(v) => onChange('hkBusinessRegistrationNumber', v)}
            placeholder="e.g., 12345678-000"
          />
        )}

        {isChina && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Business Registration Number / 工商注冊號"
              name="cnBusinessRegistrationNumber"
              required
              value={data.cnBusinessRegistrationNumber}
              onChange={(v) => onChange('cnBusinessRegistrationNumber', v)}
              placeholder="e.g., 123456789012345"
            />

            <FormInput
              label="Unified Social Credit Code / 統一社會信用代碼"
              name="cnUnifiedSocialCreditCode"
              required
              value={data.cnUnifiedSocialCreditCode}
              onChange={(v) => onChange('cnUnifiedSocialCreditCode', v)}
              placeholder="e.g., 123456789012345678"
            />
          </div>
        )}

        {isChina && (
          <FormInput
            label="Employees eligible to work legally in Hong Kong / 可以在香港合法工作的雇員數"
            name="hkWorkEligibleEmployees"
            type="number"
            required
            value={data.hkWorkEligibleEmployees}
            onChange={(v) => onChange('hkWorkEligibleEmployees', v)}
            placeholder="e.g., 5"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <FileUpload
            label="Business Registration / 商業登記證"
            name="businessRegistration"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(file) => onChange('businessRegistration', file)}
          />

          <FileUpload
            label="Company Photos / 公司形象照片"
            name="companyPhotos"
            accept=".jpg,.jpeg,.png"
            onChange={(file) => onChange('companyPhotos', file)}
          />
        </div>

        <FormSelect
          label="Company Type / 公司類型"
          name="companyType"
          type="checkbox"
          multiple
          required
          value={data.companyType}
          onChange={(v) => onChange('companyType', v as string[])}
          options={companyTypeOptions}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-light text-gray-700">
              Represented Brands / 代理品牌
              <span className="text-xs text-gray-500 ml-2">
                (At least one required / 至少填一個)
              </span>
            </label>
            <button
              type="button"
              onClick={addBrand}
              className="px-3 py-1 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors"
            >
              + Add Brand / 添加品牌
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 justify-items-start">
            {(data.representedBrands || ['']).map((brand, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => updateBrand(index, e.target.value)}
                  placeholder="e.g., Brand A"
                  required={index === 0}
                  className="w-[240px] px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                {(data.representedBrands || ['']).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBrand(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Warehouse Information / 倉庫信息
            </h4>
            <button
              type="button"
              onClick={addWarehouse}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              + Add Warehouse / 添加倉庫
            </button>
          </div>

          {(!data.warehouses || data.warehouses.length === 0) ? (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded bg-gray-50">
              <p className="text-gray-500 text-sm">
                No warehouses added yet. Click "Add Warehouse" to add warehouse information.
                <br />
                尚未添加倉庫。點擊"添加倉庫"按鈕添加倉庫信息。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(data.warehouses || []).map((warehouse, index) => (
                <div key={index} className="border border-gray-200 p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-700">
                      Warehouse #{index + 1} / 倉庫 #{index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removeWarehouse(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove / 刪除
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-light text-gray-700 mb-1">
                        Warehouse Address / 倉庫地址
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        value={warehouse.address}
                        onChange={(e) => updateWarehouse(index, 'address', e.target.value)}
                        placeholder="Enter warehouse address"
                        required
                        className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-light text-gray-700 mb-1">
                        Storage Capacity (sqft) / 庫存容量（平方呎）
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="number"
                        value={warehouse.capacity}
                        onChange={(e) => updateWarehouse(index, 'capacity', e.target.value)}
                        placeholder="e.g., 10000"
                        required
                        className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Company Brochure
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            You can upload files or provide a link to your company website.
            <br />
            您可以上傳文件或提供公司網站鏈接。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-light text-gray-700 mb-2">
                Upload Files / 上傳文件
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  onChange('companySupplementFile', files.length > 0 ? files : null);
                }}
                className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: PDF, JPG, PNG / 支援格式：PDF、JPG、PNG
              </p>
              {data.companySupplementFile && (
                <p className="text-xs text-gray-500 mt-1">
                  {Array.isArray(data.companySupplementFile)
                    ? `${data.companySupplementFile.length} file(s) selected / 已選擇 ${data.companySupplementFile.length} 個文件`
                    : '1 file selected / 已選擇 1 個文件'}
                </p>
              )}
            </div>

            <FormInput
              label="Or enter company website / 或輸入公司網站"
              name="companySupplementLink"
              type="url"
              value={data.companySupplementLink}
              onChange={(v) => onChange('companySupplementLink', v)}
              placeholder="https://..."
            />
          </div>
        </div>
      </FormSection>

      {/* Section 2: Product Management System */}
      <FormSection title="Section 2: Product Management System / 產品管理系統">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Product Catalog Template / 產品目錄模板
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Please fill in product information as follows / 請按以下格式填寫產品信息：
          </p>
          <div className="bg-gray-50 p-4 border border-gray-200 mb-4 text-sm">
            <p>【Product Category / 產品類別】：_____________</p>
            <p>【Product Brand / 產品品牌】：_____________</p>
            <p>【Product Series / 產品系列】：_____________</p>
          </div>

          <button
            type="button"
            onClick={addProduct}
            className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
          >
            + Add Product / 添加產品
          </button>
        </div>

        {data.products.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="mt-4 text-sm text-gray-500">
              No products added yet
              <br />
              尚未添加產品
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.products.map((product, index) => (
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
                      label="Product Category / 產品類別"
                      name={`category-${product.id}`}
                      required
                      value={product.category}
                      onChange={(v) => updateProduct(product.id, 'category', v)}
                      placeholder="e.g., Furniture, Lighting"
                    />

                    <FormInput
                      label="Product Brand / 產品品牌"
                      name={`brand-${product.id}`}
                      required
                      value={product.brand}
                      onChange={(v) => updateProduct(product.id, 'brand', v)}
                    />

                    <FormInput
                      label="Product Series / 產品系列"
                      name={`series-${product.id}`}
                      value={product.series || ''}
                      onChange={(v) => updateProduct(product.id, 'series', v)}
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Product List / 產品清單
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="SKU / SKU編碼"
                        name={`sku-${product.id}`}
                        value={product.sku || ''}
                        onChange={(v) => updateProduct(product.id, 'sku', v)}
                      />

                      <FormInput
                        label="Product Name / 產品名稱"
                        name={`productName-${product.id}`}
                        required
                        value={product.productName}
                        onChange={(v) =>
                          updateProduct(product.id, 'productName', v)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormInput
                        label="size / 規格"
                        name={`spec-${product.id}`}
                        required
                        value={product.spec}
                        onChange={(v) => updateProduct(product.id, 'spec', v)}
                        placeholder="e.g., 120cm x 60cm x 75cm"
                      />

                      <FormInput
                        label="Material / 材質"
                        name={`material-${product.id}`}
                        value={product.material || ''}
                        onChange={(v) =>
                          updateProduct(product.id, 'material', v)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <FormInput
                        label="Unit Price (HKD) / 單價（港幣）"
                        name={`unitPrice-${product.id}`}
                        type="number"
                        required
                        value={product.unitPrice}
                        onChange={(v) =>
                          updateProduct(product.id, 'unitPrice', v)
                        }
                      />

                      <FormInput
                        label="MOQ / 最小起訂量"
                        name={`moq-${product.id}`}
                        type="number"
                        required
                        value={product.moq}
                        onChange={(v) => updateProduct(product.id, 'moq', v)}
                      />

                      <FormSelect
                        label="Origin / 產地"
                        name={`origin-${product.id}`}
                        required
                        value={product.origin || ''}
                        onChange={(v) =>
                          updateProduct(product.id, 'origin', v as string)
                        }
                        options={countryOptions}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <FormInput
                        label="Lead Time (days) / 交貨周期"
                        name={`leadTime-${product.id}`}
                        type="number"
                        required
                        value={product.leadTime}
                        onChange={(v) =>
                          updateProduct(product.id, 'leadTime', v)
                        }
                      />

                      <FormInput
                        label="Current Stock / 現有庫存"
                        name={`currentStock-${product.id}`}
                        type="number"
                        value={product.currentStock || ''}
                        onChange={(v) =>
                          updateProduct(product.id, 'currentStock', v)
                        }
                        placeholder=""
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-light text-gray-700 mb-2">
                        Product Photos / 產品照片
                        <span className="text-xs text-gray-500 ml-2">
                          (Max 9 photos / 最多9張)
                        </span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 9) {
                            alert('Maximum 9 photos allowed / 最多只能上傳9張照片');
                            return;
                          }
                          updateProduct(product.id, 'photos', files);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Accepted formats: images (JPG/PNG/HEIC etc.) / 支援格式：圖片（JPG/PNG/HEIC 等）
                      </p>
                      {product.photos && product.photos.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {product.photos.length} photo(s) selected / 已選擇 {product.photos.length} 張照片
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-light text-gray-700 mb-2">
                        Product Specification / 產品規格書
                      </label>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Upload PDF / 上傳PDF文件
                          </label>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              updateProduct(product.id, 'specificationFile', file);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Accepted formats: PDF / 支援格式：PDF
                          </p>
                          {product.specificationFile && (
                            <p className="text-xs text-gray-500 mt-1">
                              {product.specificationFile.name}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Or enter link / 或輸入鏈接
                          </label>
                          <input
                            type="url"
                            value={product.specificationLink || ''}
                            onChange={(e) =>
                              updateProduct(product.id, 'specificationLink', e.target.value)
                            }
                            placeholder="https://..."
                            className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <FileUpload
                        label="3D Model / 3D模型"
                        name={`model3D-${product.id}`}
                        accept=".obj,.fbx,.stl,.glb,.gltf"
                        onChange={(file) =>
                          updateProduct(product.id, 'model3D', file)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>

      {/* Section 3: Project Highlights */}
      <FormSection title="Section 3: Project Highlights / 亮點項目">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Project Highlights / 亮點項目
              <span className="text-red-500 ml-1">*</span>
            </h4>
            <button
              type="button"
              onClick={addProjectHighlight}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              + Add Project / 添加項目
            </button>
          </div>

          {(!data.projectHighlights || data.projectHighlights.length === 0) ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded">
              <p className="text-gray-500 text-sm">
                No projects added yet. Click "Add Project" to add project highlights.
                <br />
                尚未添加項目。點擊"添加項目"按鈕添加亮點項目。
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(data.projectHighlights || []).map((project, index) => (
                <div
                  key={project.id}
                  className="border border-gray-200 p-6 bg-gray-50 rounded"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-medium text-gray-900">
                      Project {index + 1} / 項目 {index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removeProjectHighlight(project.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove / 刪除
                    </button>
                  </div>

                  <div className="space-y-4">
                    <FormInput
                      label="Project Name / 項目名稱"
                      name={`project-name-${project.id}`}
                      required
                      value={project.projectName}
                      onChange={(v) =>
                        updateProjectHighlight(project.id, 'projectName', v)
                      }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Year / 年份"
                        name={`project-year-${project.id}`}
                        required
                        value={project.year}
                        onChange={(v) =>
                          updateProjectHighlight(project.id, 'year', v)
                        }
                        placeholder="e.g., 2024"
                      />

                      <FormInput
                        label="Area (sqft) / 面積（平方呎）"
                        name={`project-area-${project.id}`}
                        required
                        value={project.area}
                        onChange={(v) =>
                          updateProjectHighlight(project.id, 'area', v)
                        }
                        placeholder="e.g., 1500 sq ft"
                      />

                      <FormInput
                        label="Building Name / 大廈名稱"
                        name={`project-address-${project.id}`}
                        required
                        value={project.address}
                        onChange={(v) =>
                          updateProjectHighlight(project.id, 'address', v)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSelect
                        label="Project Scope / 是否重新裝修？"
                        name={`project-renovation-${project.id}`}
                        type="radio"
                        required
                        value={project.renovationType}
                        onChange={(v) =>
                          updateProjectHighlight(project.id, 'renovationType', v)
                        }
                        options={[
                          { value: 'newFitout', label: 'New Fitout 全新装修' },
                          { value: 'remodel', label: 'Remodel 改造翻新' },
                        ]}
                      />

                      <FormSelect
                        label="Property Types / 主要项目類型"
                        name={`project-types-${project.id}`}
                        type="checkbox"
                        multiple
                        required
                        value={project.projectTypes || []}
                        onChange={(v) =>
                          updateProjectHighlight(project.id, 'projectTypes', v as string[])
                        }
                        options={projectTypeOptions}
                      />
                    </div>

                    <MultiImageUpload
                      label="Project Photos / 項目照片"
                      name={`project-photos-${project.id}`}
                      required
                      maxFiles={9}
                      onChange={(files) =>
                        updateProjectHighlight(project.id, 'photos', files)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      {/* Section 4: Sample Service */}
      <FormSection title="Section 4: Sample Service / 樣品服務">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Sample Policy / 樣品政策
        </h4>

        <div className="space-y-4">
          <FormSelect
            label="Sample Provided / 樣品提供"
            name="sampleProvided"
            type="radio"
            required
            value={data.sampleProvided}
            onChange={(v) => onChange('sampleProvided', v as 'yes' | 'no')}
            options={[
              { value: 'yes', label: 'Yes 是' },
              { value: 'no', label: 'No 否' },
            ]}
          />

          {data.sampleProvided === 'yes' && (
            <>
              <FormSelect
                label="Sample Cost / 樣品費用"
                name="sampleCost"
                type="radio"
                required
                value={data.sampleCost}
                onChange={(v) => onChange('sampleCost', v as 'free' | 'charged')}
                options={[
                  { value: 'free', label: 'Free 免費' },
                  { value: 'charged', label: 'Charged 收費' },
                ]}
              />

              <FormInput
                label="Sample Delivery Time to HK / 樣品到香港寄送時間 (days)"
                name="sampleDeliveryTime"
                type="number"
                required
                value={data.sampleDeliveryTime}
                onChange={(v) => onChange('sampleDeliveryTime', v)}
                placeholder="e.g., 7"
              />

              <FormSelect
                label="Free Shipping to Hong Kong / 是否免費邮寄到香港"
                name="freeShippingToHK"
                type="radio"
                required
                value={data.freeShippingToHK}
                onChange={(v) => onChange('freeShippingToHK', v as 'yes' | 'no')}
                options={[
                  { value: 'yes', label: 'Yes 是' },
                  { value: 'no', label: 'No 否' },
                ]}
              />
            </>
          )}
        </div>
      </FormSection>
    </>
  );
}

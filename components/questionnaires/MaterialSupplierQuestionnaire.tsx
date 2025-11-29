import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FileUpload from '../FileUpload';
import { MaterialSupplierFormData, Product } from '@/types/supplier';

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
  const companyTypeOptions = [
    { value: 'manufacturer', label: 'Manufacturer 生產商' },
    { value: 'agent', label: 'Agent 代理商' },
    { value: 'distributor', label: 'Distributor 經銷商' },
  ];

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
      leadTime: '',
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

  return (
    <>
      {/* Section 1: Supplier Basic Information */}
      <FormSection title="Section 1: Supplier Basic Information / 供應商基本信息">
        <FormInput
          label="Company Legal Name / 公司全稱"
          name="companyLegalName"
          required
          value={data.companyLegalName}
          onChange={(v) => onChange('companyLegalName', v)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Year Established / 成立年份"
            name="yearEstablished"
            type="number"
            required
            value={data.yearEstablished}
            onChange={(v) => onChange('yearEstablished', v)}
          />

          <FormInput
            label="Registered Capital / 註冊資本"
            name="registeredCapital"
            required
            placeholder="e.g., HKD 1,000,000"
            value={data.registeredCapital}
            onChange={(v) => onChange('registeredCapital', v)}
          />
        </div>

        <FormInput
          label="Office Address / 辦公地址"
          name="officeAddress"
          required
          value={data.officeAddress}
          onChange={(v) => onChange('officeAddress', v)}
        />

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

        <FormInput
          label="Represented Brands / 代理品牌"
          name="representedBrands"
          value={data.representedBrands}
          onChange={(v) => onChange('representedBrands', v)}
          placeholder="e.g., Brand A, Brand B, Brand C"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Warehouse Address / 倉庫地址"
            name="warehouseAddress"
            required
            value={data.warehouseAddress}
            onChange={(v) => onChange('warehouseAddress', v)}
          />

          <FormInput
            label="Storage Capacity / 庫存容量 (sqft)"
            name="storageCapacity"
            type="number"
            required
            value={data.storageCapacity}
            onChange={(v) => onChange('storageCapacity', v)}
            placeholder="e.g., 10000"
          />
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
                      required
                      value={product.series}
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
                        required
                        value={product.sku}
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
                        label="Spec / 規格"
                        name={`spec-${product.id}`}
                        required
                        value={product.spec}
                        onChange={(v) => updateProduct(product.id, 'spec', v)}
                        placeholder="e.g., 120cm x 60cm x 75cm"
                      />

                      <FormInput
                        label="Material / 材質"
                        name={`material-${product.id}`}
                        required
                        value={product.material}
                        onChange={(v) =>
                          updateProduct(product.id, 'material', v)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <FormInput
                        label="Unit Price (HKD) / 單價"
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

      {/* Section 3: Sample Service */}
      <FormSection title="Section 3: Sample Service / 樣品服務">
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
                label="Sample Delivery Time / 樣品寄送時間 (days)"
                name="sampleDeliveryTime"
                type="number"
                required
                value={data.sampleDeliveryTime}
                onChange={(v) => onChange('sampleDeliveryTime', v)}
                placeholder="e.g., 7"
              />
            </>
          )}
        </div>
      </FormSection>
    </>
  );
}

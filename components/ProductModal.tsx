import React, { useState, useEffect } from 'react';
import FormInput from './FormInput';
import FileUpload from './FileUpload';
import { Product } from '@/types/supplier';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  product?: Product | null;
  productIndex?: number;
}

export default function ProductModal({
  isOpen,
  onClose,
  onSave,
  product,
  productIndex,
}: ProductModalProps) {
  const [formData, setFormData] = useState<Product>({
    id: '',
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
    currentStock: '',
    photos: [],
    specificationFile: null,
    specificationLink: '',
    model3D: null,
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
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
        currentStock: '',
        photos: [],
        specificationFile: null,
        specificationLink: '',
        model3D: null,
      });
    }
  }, [product, isOpen]);

  const updateField = (field: keyof Product, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
            <h2 className="text-xl font-light text-gray-900">
              {product
                ? `Product #${(productIndex || 0) + 1} / 產品 #${(productIndex || 0) + 1}`
                : 'Add Product / 添加產品'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Product Category / 產品類別"
                name="category"
                required
                value={formData.category}
                onChange={(v) => updateField('category', v)}
                placeholder="e.g., Furniture, Lighting"
              />

              <FormInput
                label="Product Brand / 產品品牌"
                name="brand"
                required
                value={formData.brand}
                onChange={(v) => updateField('brand', v)}
              />

              <FormInput
                label="Product Series / 產品系列"
                name="series"
                value={formData.series || ''}
                onChange={(v) => updateField('series', v)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="SKU / SKU編碼"
                name="sku"
                value={formData.sku || ''}
                onChange={(v) => updateField('sku', v)}
              />

              <FormInput
                label="Product Name / 產品名稱"
                name="productName"
                required
                value={formData.productName}
                onChange={(v) => updateField('productName', v)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Size / 規格"
                name="spec"
                required
                value={formData.spec}
                onChange={(v) => updateField('spec', v)}
                placeholder="e.g., 120cm x 60cm x 75cm"
              />

              <FormInput
                label="Material / 材質"
                name="material"
                value={formData.material || ''}
                onChange={(v) => updateField('material', v)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Unit Price (HKD) / 單價"
                name="unitPrice"
                type="number"
                required
                value={formData.unitPrice}
                onChange={(v) => updateField('unitPrice', v)}
              />

              <FormInput
                label="MOQ / 最小起訂量"
                name="moq"
                type="number"
                required
                value={formData.moq}
                onChange={(v) => updateField('moq', v)}
              />

              <FormInput
                label="Lead Time (days) / 交貨周期"
                name="leadTime"
                type="number"
                required
                value={formData.leadTime}
                onChange={(v) => updateField('leadTime', v)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Current Stock / 現有庫存"
                name="currentStock"
                type="number"
                value={formData.currentStock || ''}
                onChange={(v) => updateField('currentStock', v)}
                placeholder=""
              />
            </div>

            <div>
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
                  updateField('photos', files);
                }}
                className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              {formData.photos && formData.photos.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {formData.photos.length} photo(s) selected / 已選擇 {formData.photos.length} 張照片
                </p>
              )}
            </div>

            <div>
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
                      updateField('specificationFile', file);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                  {formData.specificationFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.specificationFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Or enter link / 或輸入鏈接
                  </label>
                  <input
                    type="url"
                    value={formData.specificationLink || ''}
                    onChange={(e) =>
                      updateField('specificationLink', e.target.value)
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <FileUpload
                label="3D Model / 3D模型"
                name="model3D"
                accept=".obj,.fbx,.stl,.glb,.gltf"
                onChange={(file) => updateField('model3D', file)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel / 取消
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              Save / 保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MaterialSupplierFormData, Product } from '@/types/supplier';
import FormInput from '@/components/FormInput';
import FileUpload from '@/components/FileUpload';

export default function ProductManagePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<MaterialSupplierFormData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Check authentication
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/');
      return;
    }

    // Load user data
    const data = localStorage.getItem('supplierData');
    if (!data) {
      router.push('/register/supplier');
      return;
    }

    const parsedData = JSON.parse(data);

    // Check if user is material supplier
    if (parsedData.supplierType !== 'material') {
      router.push('/dashboard');
      return;
    }

    setUserData(parsedData);
    setProducts(parsedData.products || []);
  }, [router]);

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
    setProducts([...products, newProduct]);
  };

  const updateProduct = (id: string, field: keyof Product, value: any) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    if (!userData) return;

    const updatedData = {
      ...userData,
      products: products,
    };

    localStorage.setItem('supplierData', JSON.stringify(updatedData));
    router.push('/dashboard');
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading... / 加載中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-900">
            Product Management / 產品管理
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Add, edit, or remove your products / 添加、編輯或刪除您的產品
          </p>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <button
              type="button"
              onClick={addProduct}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              + Add Product / 添加產品
            </button>
          </div>

          {products.length === 0 ? (
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
              {products.map((product, index) => (
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Cancel / 取消
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              Save Changes / 保存更改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

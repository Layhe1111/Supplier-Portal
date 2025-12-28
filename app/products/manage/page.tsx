'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MaterialSupplierFormData, Product } from '@/types/supplier';
import ProductModal from '@/components/ProductModal';
import { supabase } from '@/lib/supabaseClient';

export default function ProductManagePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<MaterialSupplierFormData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    const loadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const res = await fetch('/api/suppliers/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to load supplier data');
        }

        const body = await res.json();
        const supplier = body.supplier as MaterialSupplierFormData | null;
        if (!supplier) {
          router.push('/register/supplier');
          return;
        }

        if (supplier.supplierType !== 'material') {
          router.push('/dashboard');
          return;
        }

        setUserData(supplier);
        setProducts(supplier.products || []);
      } catch (err) {
        const data = localStorage.getItem('supplierData');
        if (!data) {
          router.push('/register/supplier');
          return;
        }

        const parsedData = JSON.parse(data);
        if (parsedData.supplierType !== 'material') {
          router.push('/dashboard');
          return;
        }

        setUserData(parsedData);
        setProducts(parsedData.products || []);
      }
    };

    loadData();
  }, [router]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setEditingIndex(undefined);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product, index: number) => {
    setEditingProduct(product);
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (product: Product) => {
    if (editingProduct) {
      // Edit existing product
      const updatedProducts = products.map((p) =>
        p.id === product.id ? product : p
      );
      setProducts(updatedProducts);
    } else {
      // Add new product
      setProducts([...products, product]);
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product? / 確定要刪除此產品嗎？')) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const handleSaveAll = async () => {
    if (!userData) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ products }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to save products');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save products');
    }
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
      <div className="max-w-7xl mx-auto">
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
              onClick={handleAddProduct}
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                      Product Name / 產品名稱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                      Category / 類別
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                      Brand / 品牌
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                      Price / 價格
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                      MOQ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                      Lead Time / 交期
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-light text-gray-700 uppercase tracking-wider">
                      Actions / 操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product, index) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          {product.spec && (
                            <p className="text-xs text-gray-500">{product.spec}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.category}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.brand}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        HKD {parseInt(product.unitPrice).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.moq}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {product.leadTime} days
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditProduct(product, index)}
                            className="text-blue-600 hover:text-blue-800 font-light"
                          >
                            Edit / 編輯
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-800 font-light"
                          >
                            Delete / 刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 border border-gray-300 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard / 返回儀表板
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              Save All Changes / 保存所有更改
            </button>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        productIndex={editingIndex}
      />
    </div>
  );
}

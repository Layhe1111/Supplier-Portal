'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SupplierFormData, Product } from '@/types/supplier';
import ProductModal from '@/components/ProductModal';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const didLoadRef = useRef(false);
  const [userData, setUserData] = useState<SupplierFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');

  const syncProducts = async (nextProducts: Product[]) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error('Please sign in to save products / 請先登入再保存產品');
    }

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ products: nextProducts }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to save products');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (didLoadRef.current) return;
      didLoadRef.current = true;
      setIsLoading(true);
      setError('');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setIsLoading(false);
        router.replace('/');
        return;
      }

      try {
        const meRes = await fetch('/api/suppliers/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          const body = await meRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load supplier data');
        }

        const meBody = await meRes.json();
        if (!meBody.supplier) {
          setIsLoading(false);
          router.replace('/register/supplier');
          return;
        }

        const supplier = meBody.supplier as SupplierFormData;
        setUserData(supplier);
        setProducts(supplier.supplierType === 'material' ? supplier.products || [] : []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
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

  const handleSaveProduct = async (product: Product) => {
    if (!userData || userData.supplierType !== 'material') return;

    setError('');
    const mapped: Product = { ...product };
    const exists = products.find((p) => p.id === product.id);
    const nextProducts = exists
      ? products.map((p) => (p.id === product.id ? mapped : p))
      : [mapped, ...products];

    try {
      await syncProducts(nextProducts);
      setProducts(nextProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save products');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!userData || userData.supplierType !== 'material') return;

    if (confirm('Are you sure you want to delete this product? / 確定要刪除此產品嗎？')) {
      setError('');
      const nextProducts = products.filter((p) => p.id !== id);
      try {
        await syncProducts(nextProducts);
        setProducts(nextProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save products');
      }
    }
  };

  // Get unique categories
  const categories = products.length > 0
    ? ['all', ...Array.from(new Set(products.map(p => p.category)))]
    : ['all'];

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading... / 加載中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {/* Welcome Section */}
        <div className="bg-white border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-light text-gray-900 mb-4">
            Welcome / 歡迎
          </h2>
          {userData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Company / 公司</p>
                <p className="text-base text-gray-900">
                  {(userData as any).companyName ||
                    (userData as any).companyNameChinese ||
                    (userData as any).companyLegalName ||
                    '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Supplier Type / 供應商類型</p>
                <p className="text-base text-gray-900">
                  {userData.supplierType === 'contractor' && 'Contractor / 承包商'}
                  {userData.supplierType === 'designer' && 'Designer / 設計師'}
                  {userData.supplierType === 'material' && 'Material Supplier / 材料供應商'}
                  {userData.supplierType === 'basic' && 'Basic Supplier / 基礎供應商'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Contact / 聯繫人</p>
                <p className="text-base text-gray-900">
                  {(userData as any).submitterName ||
                    (userData as any).submitterEmail ||
                    (userData as any).contactEmail ||
                    '-'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Product Statistics - Only show for material suppliers */}
        {userData?.supplierType === 'material' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Products / 總產品</p>
                  <p className="text-2xl font-light text-gray-900">
                    {products.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categories / 類別</p>
                  <p className="text-2xl font-light text-gray-900">
                    {categories.length - 1}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <button
                onClick={handleAddProduct}
                className="w-full h-full flex flex-col items-center justify-center hover:bg-gray-50 transition-colors group"
              >
                <div className="w-12 h-12 bg-gray-900 group-hover:bg-gray-800 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-light text-gray-900">
                  Add Products / 添加產品
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Product Management - Only show for material suppliers */}
        {userData?.supplierType === 'material' && (
          <div className="bg-white border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-light text-gray-900">
                Product Catalog / 產品目錄
              </h3>
            </div>

            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <input
                  type="text"
                  placeholder="Search products... / 搜索產品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories / 所有類別' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products List */}
            {products.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="mt-4 text-sm text-gray-500 mb-4">
                  No products added yet
                  <br />
                  尚未添加產品
                </p>
                <button
                  onClick={handleAddProduct}
                  className="px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
                >
                  Add Your First Product / 添加您的第一個產品
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 border border-gray-300">
                <p className="text-sm text-gray-500">
                  No products match your search
                  <br />
                  沒有符合搜索條件的產品
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
                    {filteredProducts.map((product, index) => (
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
                          {product.unitPrice ? `HKD ${parseInt(product.unitPrice).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.moq}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.leadTime ? `${product.leadTime} days` : '-'}
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

            {filteredProducts.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
                / 顯示 {filteredProducts.length} / {products.length} 個產品
              </div>
            )}
          </div>
        )}

        {/* Info Section for Non-Material Suppliers */}
        {userData?.supplierType !== 'material' && (
          <div className="bg-white border border-gray-200 p-8">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-light text-gray-900">
                {userData?.supplierType === 'contractor' && 'Contractor Dashboard / 承包商儀表板'}
                {userData?.supplierType === 'designer' && 'Designer Dashboard / 設計師儀表板'}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your profile has been successfully registered.
                <br />
                您的檔案已成功註冊。
              </p>
              <button
                onClick={() => router.push('/register/supplier')}
                className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
              >
                Edit Profile / 編輯檔案
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal - Only for material suppliers */}
      {userData?.supplierType === 'material' && (
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          product={editingProduct}
          productIndex={editingIndex}
        />
      )}
    </div>
  );
}

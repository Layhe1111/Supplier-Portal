'use client';

import { useEffect, useState } from 'react';
import { SupplierDirectoryEntry } from '@/types/supplier';
import { supabase } from '@/lib/supabaseClient';

export default function SuppliersDirectoryPage() {
  const [suppliers, setSuppliers] = useState<SupplierDirectoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      try {
        const res = await fetch('/api/suppliers/basic', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          throw new Error('Failed to load suppliers');
        }
        const body = await res.json().catch(() => ({ suppliers: [] }));
        setSuppliers(body.suppliers || []);
      } catch (err) {
        console.error('Failed to load supplier data', err);
        setSuppliers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      supplier.companyName.toLowerCase().includes(searchLower) ||
      (supplier.companyNameChinese?.toLowerCase().includes(searchLower) ?? false) ||
      supplier.businessType.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 p-8 mb-8">
          <h1 className="text-2xl font-light text-gray-900">
            Supplier Directory / 供應商黃頁
          </h1>
    
        </div>

        <div className="bg-white border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-light text-gray-900">
              Suppliers / 供應商列表
            </h3>
            <div className="flex-1 max-w-md ml-8">
              <input
                type="text"
                placeholder="Search by name / 搜索公司名稱"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading... / 加載中...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No suppliers found / 未找到供應商
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto">
              {filteredSuppliers.map((supplier, index) => (
                <div
                  key={`${supplier.companyName}-${index}`}
                  className="border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <h4 className="text-base font-medium text-gray-900 mb-1">
                    {supplier.companyName}
                  </h4>
                  {supplier.companyNameChinese && (
                    <p className="text-sm text-gray-700 mb-3">
                      {supplier.companyNameChinese}
                    </p>
                  )}

                  <p className="text-sm text-gray-600 mb-3">
                    {supplier.officeAddress || '-'}
                  </p>

                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">T:</span> ({supplier.submitterPhoneCode}) {supplier.submitterPhone}
                    </p>
                    {supplier.contactFax && (
                      <p>
                        <span className="font-medium">F:</span> ({supplier.submitterPhoneCode}) {supplier.contactFax}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">E:</span> {supplier.submitterEmail}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-yellow-600 mr-2">▶</span>
                    <span className="text-gray-700">
                      <span className="font-medium">{supplier.businessType}</span>
                    </span>
                  </div>

                  {supplier.businessDescription && (
                    <p className="mt-3 text-sm text-gray-600 italic">
                      {supplier.businessDescription}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredSuppliers.length} of {suppliers.length} suppliers
            / 顯示 {filteredSuppliers.length} / {suppliers.length} 個供應商
          </div>
        </div>
      </main>
    </div>
  );
}

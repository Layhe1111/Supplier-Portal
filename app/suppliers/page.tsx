'use client';

import { useEffect, useRef, useState } from 'react';
import { SupplierDirectoryEntry } from '@/types/supplier';
import { supabase } from '@/lib/supabaseClient';

export default function SuppliersDirectoryPage() {
  const [suppliers, setSuppliers] = useState<SupplierDirectoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('submitted');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalCount, setTotalCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<{
    supabaseHost?: string;
    supplierCount?: number;
    supplierCountExact?: number | null;
    companyCount?: number;
    contactCount?: number;
  } | null>(null);
  const skipFirstFetchRef = useRef(false);
  const prevQueryRef = useRef({ searchTerm, pageSize, sortBy, typeFilter });

  useEffect(() => {
    const prevQuery = prevQueryRef.current;
    const filtersChanged =
      prevQuery.searchTerm !== searchTerm ||
      prevQuery.pageSize !== pageSize ||
      prevQuery.sortBy !== sortBy ||
      prevQuery.typeFilter !== typeFilter;
    prevQueryRef.current = { searchTerm, pageSize, sortBy, typeFilter };

    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    if (process.env.NODE_ENV !== 'production' && !skipFirstFetchRef.current) {
      skipFirstFetchRef.current = true;
      return;
    }

    const loadSuppliers = async () => {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const debug =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('debug') === '1';
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        sort: sortBy,
      });
      if (searchTerm.trim()) {
        params.set('q', searchTerm.trim());
      }
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      if (debug) {
        params.set('debug', '1');
      }
      const endpoint = `/api/suppliers/basic?${params.toString()}`;

      try {
        const res = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          throw new Error('Failed to load suppliers');
        }
        const body = await res.json().catch(() => ({ suppliers: [] }));
        setSuppliers(body.suppliers || []);
        setTotalCount(body.totalCount ?? (body.suppliers || []).length);
        if (debug && body.debug) {
          setDebugInfo(body.debug);
        } else {
          setDebugInfo(null);
        }
      } catch (err) {
        console.error('Failed to load supplier data', err);
        setSuppliers([]);
        setTotalCount(0);
        setDebugInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuppliers();
  }, [currentPage, pageSize, searchTerm, sortBy, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = totalCount === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + suppliers.length, totalCount);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const renderPagination = () => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-600">
        {totalCount === 0
          ? 'Showing 0 suppliers / 顯示 0 個供應商'
          : `Showing ${startIndex + 1}-${endIndex} of ${totalCount} suppliers / 顯示 ${startIndex + 1}-${endIndex} / ${totalCount} 個供應商`}
        {searchTerm.trim() && <span className="ml-2 text-gray-500">(Filtered)</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">
          Per page / 每頁
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="ml-2 px-2 py-1 border border-gray-300 text-sm"
          >
            {[30, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={safePage === 1}
            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev / 上一頁
          </button>
          <span className="text-sm text-gray-600">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={safePage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next / 下一頁
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 p-8 mb-8">
          <h1 className="text-2xl font-light text-gray-900">
            Supplier Directory / 供應商黃頁
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Total suppliers: {totalCount} / 供應商總數：{totalCount}
          </p>
          {debugInfo && (
            <p className="mt-2 text-xs text-gray-500">
              Debug: host {debugInfo.supabaseHost || '-'}, suppliers {debugInfo.supplierCount ?? '-'},
              companies {debugInfo.companyCount ?? '-'}, contacts {debugInfo.contactCount ?? '-'}
            </p>
          )}
        </div>

        <div className="bg-white border border-gray-200 p-8">
          <div className="mb-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-lg font-light text-gray-900">
                Suppliers / 供應商列表
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="text"
                  placeholder="Search / 搜索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
                <label className="flex items-center text-sm text-gray-600">
                  Sort / 排序
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="ml-2 px-2 py-2 border border-gray-300 text-sm"
                  >
                    <option value="submitted">Submission time / 按提交時間</option>
                    <option value="alpha">Alphabetical / 按字母順序</option>
                  </select>
                </label>
                <label className="flex items-center text-sm text-gray-600">
                  Type / 類型
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="ml-2 w-40 px-2 py-2 border border-gray-300 text-sm"
                  >
                    <option value="all">All / 全部</option>
                    <option value="designer">Designer / 設計師</option>
                    <option value="contractor">Contractor / 承包商</option>
                    <option value="material">Material/Furniture Supplier / 材料家具供應商</option>
                    <option value="Sustainable Development & Growth">
                      Sustainable Development &amp; Growth / 可持續發展與成長
                    </option>
                    <option value="Green Roof System">
                      Green Roof System / 綠化屋頂系統
                    </option>
                    <option value="Flooring">Flooring / 地板</option>
                    <option value="Energy Saving & Efficiency">
                      Energy Saving &amp; Efficiency / 節能與效率
                    </option>
                    <option value="Indoor Air Quality">
                      Indoor Air Quality / 室內空氣品質
                    </option>
                    <option value="Environmentally Friendly Materials">
                      Environmentally Friendly Materials / 環保材料
                    </option>
                    <option value="Acoustic Products & Materials">
                      Acoustic Products &amp; Materials / 聲學產品與材料
                    </option>
                    <option value="Balustrade, Glass">
                      Balustrade, Glass / 欄杆及玻璃
                    </option>
                    <option value="Claddings">Claddings / 牆面覆層</option>
                    <option value="Fire Protection Materials & Systems">
                      Fire Protection Materials &amp; Systems / 防火材料與系統
                    </option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSortBy('submitted');
                  setTypeFilter('all');
                }}
                className="px-4 py-2 text-sm font-light text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Reset / 重置
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading... / 加載中...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No suppliers found / 未找到供應商
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suppliers.map((supplier, index) => (
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
                      <span className="font-medium">T:</span>{' '}
                      {supplier.submitterPhoneCode
                        ? `(${supplier.submitterPhoneCode}) ${supplier.submitterPhone}`
                        : supplier.submitterPhone}
                    </p>
                    {supplier.contactFax && (
                      <p>
                        <span className="font-medium">F:</span> {supplier.contactFax}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">E:</span> {supplier.submitterEmail}
                    </p>
                    {supplier.companySupplementLink && (
                      <p>
                        <span className="font-medium">W:</span>{' '}
                        <a
                          href={supplier.companySupplementLink}
                          className="text-gray-700 underline hover:text-gray-900"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {supplier.companySupplementLink}
                        </a>
                      </p>
                    )}
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

          {!isLoading && (
            <div className="mt-6">
              {renderPagination()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

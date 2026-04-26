'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../components/leads/EmptyState';
import { FilterBar } from '../../components/leads/FilterBar';
import { LeadCard } from '../../components/leads/LeadCard';
import { LeadTable } from '../../components/leads/LeadTable';
import { LoadingState } from '../../components/leads/LoadingState';
import { PageHeader } from '../../components/leads/PageHeader';
import { PaginationControls } from '../../components/leads/PaginationControls';
import { LeadFilters, LeadListItem, LeadListResponse } from '../../components/leads/types';

const defaultFilters: LeadFilters = {
  q: '',
  storeId: 'ALL',
  salesId: 'ALL',
  status: 'ALL',
  identityStatus: 'ALL',
  source: 'ALL',
  visitDateFrom: '',
  visitDateTo: '',
  createdDateFrom: '',
  createdDateTo: ''
};

export default function LeadsPage() {
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storeOptions = useMemo(() => {
    const stores = [...new Set(items.map((lead) => lead.storeId))];
    return [{ label: 'All stores', value: 'ALL' }, ...stores.map((store) => ({ label: store, value: store }))];
  }, [items]);

  const salesOptions = useMemo(() => {
    const sales = [...new Set(items.map((lead) => lead.salesId))];
    return [{ label: 'All sales', value: 'ALL' }, ...sales.map((salesId) => ({ label: salesId, value: salesId }))];
  }, [items]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLeads() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

        Object.entries(filters).forEach(([key, value]) => {
          if (!value || value === 'ALL') return;
          params.set(key, value);
        });

        const response = await fetch(`/api/leads?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Unable to load leads');
        }

        const payload = (await response.json()) as LeadListResponse;
        setItems(payload.data);
        setTotal(payload.pagination.total);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') return;
        setError('Could not load leads. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
    return () => controller.abort();
  }, [filters, page, pageSize]);

  const onFilterChange = (key: keyof LeadFilters, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const onClearFilters = () => {
    setPage(1);
    setFilters(defaultFilters);
  };

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-4 py-5 font-sans text-[#2E2E2E] md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <PageHeader />

        <FilterBar
          filters={filters}
          onChange={onFilterChange}
          onClear={onClearFilters}
          storeOptions={storeOptions}
          salesOptions={salesOptions}
        />

        {loading && <LoadingState />}

        {!loading && error && (
          <div className="rounded-2xl border border-[#E5CFCF] bg-[#FFF5F5] p-5 text-sm text-[#7A4343]">{error}</div>
        )}

        {!loading && !error && items.length === 0 && <EmptyState />}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="grid gap-3 md:hidden">
              {items.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>

            <LeadTable leads={items} />

            <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </main>
  );
}

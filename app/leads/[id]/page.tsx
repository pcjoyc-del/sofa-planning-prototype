'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { EmptyState } from '../../../components/leads/EmptyState';
import { LoadingState } from '../../../components/leads/LoadingState';
import { EditLeadForm } from '../../../components/leads/detail/EditLeadForm';
import { IdentityLinkCard } from '../../../components/leads/detail/IdentityLinkCard';
import { InfoRow } from '../../../components/leads/detail/InfoRow';
import { PageHeader } from '../../../components/leads/detail/PageHeader';
import { SectionCard } from '../../../components/leads/detail/SectionCard';
import { TimelineList } from '../../../components/leads/detail/TimelineList';
import { EditLeadForm as EditLeadFormType, LeadDetail } from '../../../components/leads/detail/types';

function toEditForm(lead: LeadDetail): EditLeadFormType {
  return {
    status: lead.status,
    note: lead.note || '',
    phone: lead.phone || '',
    lineId: lead.lineId || '',
    customerName: lead.customerName || '',
    interestedModelCode: lead.interestedModelCode || '',
    priceRangeCode: lead.priceRangeCode || '',
    usageTimingCode: lead.usageTimingCode || '',
    residenceTypeCode: lead.residenceTypeCode || '',
    customerGroupCode: lead.customerGroupCode || '',
    ageRangeCode: lead.ageRangeCode || '',
    customerLocation: lead.customerLocation || '',
    firstQuestion: lead.firstQuestion || '',
    customerTypeFlagCode: lead.customerTypeFlagCode || '',
    interestedProductCategoryCode: lead.interestedProductCategoryCode || ''
  };
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<EditLeadFormType | null>(null);

  async function loadLead() {
    if (!id) return;
    setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const response = await fetch(`/api/leads/${id}`);
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) throw new Error('Unable to load lead');
      const payload = (await response.json()) as LeadDetail;
      setLead(payload);
      setForm(toEditForm(payload));
    } catch {
      setError('Could not load this lead right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onEditChange = (key: keyof EditLeadFormType, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const patchPayload = useMemo(() => {
    if (!lead || !form) return null;
    const normalized = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as EditLeadFormType;
    const draft: Record<string, string | null> = {};

    (Object.keys(normalized) as Array<keyof EditLeadFormType>).forEach((key) => {
      const current = normalized[key] || null;
      const original = (lead[key] as string | null) || null;
      if (current !== original) {
        draft[key] = current;
      }
    });

    return draft;
  }, [lead, form]);

  const onSave = async () => {
    if (!id || !patchPayload || Object.keys(patchPayload).length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const actorUserId =
        typeof window !== 'undefined' ? window.localStorage.getItem('crm_actor_user_id') || undefined : undefined;

      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patchPayload, ...(actorUserId ? { actorUserId } : {}) })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message || 'Unable to save changes');
      }

      setSuccess('Lead updated successfully.');
      setEditing(false);
      await loadLead();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-4 py-5 md:px-8">
        <div className="mx-auto max-w-4xl"><LoadingState /></div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-4 py-5 md:px-8">
        <div className="mx-auto max-w-4xl"><EmptyState /></div>
      </main>
    );
  }

  if (error && !lead) {
    return (
      <main className="min-h-screen bg-[#F5F0E6] px-4 py-5 md:px-8">
        <div className="mx-auto rounded-2xl border border-[#E5CFCF] bg-[#FFF5F5] p-5 text-sm text-[#7A4343]">{error}</div>
      </main>
    );
  }

  if (!lead || !form) return null;

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-4 py-5 font-sans text-[#2E2E2E] md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <PageHeader id={lead.id} status={lead.status} identityStatus={lead.identityStatus} />

        {success ? <div className="rounded-xl border border-[#CCE0C8] bg-[#EEF8EC] px-3 py-2 text-sm text-[#355F32]">{success}</div> : null}
        {error ? <div className="rounded-xl border border-[#E5CFCF] bg-[#FFF6F6] px-3 py-2 text-sm text-[#9A4444]">{error}</div> : null}

        <SectionCard
          title="Lead Details"
          action={
            !editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-10 rounded-lg border border-[#D8C8B5] px-3 text-sm text-[#6B4F3A]"
              >
                Edit
              </button>
            ) : null
          }
        >
          {editing ? (
            <EditLeadForm
              form={form}
              onChange={onEditChange}
              onSave={onSave}
              onCancel={() => {
                setForm(toEditForm(lead));
                setEditing(false);
              }}
              saving={saving}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <SectionCard title="Visit Info">
                <InfoRow label="Visit DateTime" value={new Date(lead.visitDatetime).toLocaleString()} />
                <InfoRow label="Store" value={lead.storeId} />
                <InfoRow label="Sales" value={lead.salesId} />
                <InfoRow label="Source" value={lead.source} />
              </SectionCard>

              <SectionCard title="Customer Info">
                <InfoRow label="Customer Name" value={lead.customerName || '-'} />
                <InfoRow label="Phone" value={lead.phone || '-'} />
                <InfoRow label="LINE ID" value={lead.lineId || '-'} />
              </SectionCard>

              <SectionCard title="Qualification">
                <InfoRow label="Interested Model" value={lead.interestedModelCode || '-'} />
                <InfoRow label="Price Range" value={lead.priceRangeCode || '-'} />
                <InfoRow label="Usage Timing" value={lead.usageTimingCode || '-'} />
                <InfoRow label="Residence Type" value={lead.residenceTypeCode || '-'} />
                <InfoRow label="Customer Group" value={lead.customerGroupCode || '-'} />
                <InfoRow label="Age Range" value={lead.ageRangeCode || '-'} />
                <InfoRow label="Customer Location" value={lead.customerLocation || '-'} />
                <InfoRow label="First Question" value={lead.firstQuestion || '-'} />
                <InfoRow label="Customer Type" value={lead.customerTypeFlagCode || '-'} />
                <InfoRow label="Product Category" value={lead.interestedProductCategoryCode || '-'} />
              </SectionCard>

              <SectionCard title="Note">
                <p className="text-sm text-[#3E3934]">{lead.note || '-'}</p>
              </SectionCard>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Status History">
          <TimelineList items={lead.statusHistory} />
        </SectionCard>

        <SectionCard title="Identity Links">
          {lead.identityLinks.length === 0 ? (
            <p className="text-sm text-[#6A6056]">No identity links yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {lead.identityLinks.map((item) => (
                <IdentityLinkCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}

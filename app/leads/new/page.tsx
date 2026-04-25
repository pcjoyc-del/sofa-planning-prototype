'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateTimeInput } from '../../../components/leads/new/DateTimeInput';
import { FormSectionTitle } from '../../../components/leads/new/FormSectionTitle';
import { InlineError } from '../../../components/leads/new/InlineError';
import { PageHeader } from '../../../components/leads/new/PageHeader';
import { PrimaryButton } from '../../../components/leads/new/PrimaryButton';
import { SecondaryButton } from '../../../components/leads/new/SecondaryButton';
import { SectionCard } from '../../../components/leads/new/SectionCard';
import { SelectInput } from '../../../components/leads/new/SelectInput';
import { TextArea } from '../../../components/leads/new/TextArea';
import { TextInput } from '../../../components/leads/new/TextInput';
import { FieldErrors, NewLeadForm } from '../../../components/leads/new/types';

const initialForm: NewLeadForm = {
  visitDatetime: '',
  storeId: '',
  salesId: '',
  source: '',
  customerName: '',
  phone: '',
  lineId: '',
  interestedModelCode: '',
  priceRangeCode: '',
  usageTimingCode: '',
  residenceTypeCode: '',
  customerGroupCode: '',
  ageRangeCode: '',
  customerLocation: '',
  firstQuestion: '',
  customerTypeFlagCode: '',
  interestedProductCategoryCode: '',
  note: ''
};

const sourceOptions = [
  { label: 'Select source', value: '' },
  { label: 'Walk-in', value: 'WALK_IN' },
  { label: 'LINE', value: 'LINE' },
  { label: 'Phone Call', value: 'PHONE_CALL' },
  { label: 'Facebook', value: 'FACEBOOK' },
  { label: 'Referral', value: 'REFERRAL' },
  { label: 'Event', value: 'EVENT' },
  { label: 'Other', value: 'OTHER' }
];

const storeOptions = [
  { label: 'Select store', value: '' },
  { label: 'Sofa Plus Bangna', value: 'BKK-BANGNA' },
  { label: 'Sofa Plus Central Chiang Mai', value: 'CNX-CENTRAL' }
];

const salesOptions = [
  { label: 'Select sales', value: '' },
  { label: 'Ploy (Bangna)', value: 'SP-S-001' },
  { label: 'Ton (Bangna)', value: 'SP-S-002' },
  { label: 'Mint (Chiang Mai)', value: 'SP-S-003' }
];

const priceRangeOptions = [
  { label: 'Select price range', value: '' },
  { label: '20,000-40,000 THB', value: 'PR_20_40K' },
  { label: '40,001-70,000 THB', value: 'PR_40_70K' }
];

const usageTimingOptions = [
  { label: 'Select usage timing', value: '' },
  { label: 'Immediate (0-1 month)', value: 'USE_IMMEDIATE' },
  { label: 'Within 3-6 months', value: 'USE_3_6M' }
];

const residenceTypeOptions = [
  { label: 'Select residence type', value: '' },
  { label: 'Condo', value: 'RES_CONDO' },
  { label: 'House', value: 'RES_HOUSE' }
];

const customerGroupOptions = [
  { label: 'Select customer group', value: '' },
  { label: 'Newly-wed', value: 'CG_NEWLYWED' },
  { label: 'Family with kids', value: 'CG_FAMILY' }
];

const ageRangeOptions = [
  { label: 'Select age range', value: '' },
  { label: '25-34', value: 'AGE_25_34' },
  { label: '35-44', value: 'AGE_35_44' }
];

const customerTypeFlagOptions = [
  { label: 'Select customer type', value: '' },
  { label: 'First-time buyer', value: 'CTF_FIRST_TIME' },
  { label: 'Replacement buyer', value: 'CTF_REPLACE' }
];

const interestedProductCategoryOptions = [
  { label: 'Select product category', value: '' },
  { label: 'Sofa Set', value: 'CAT_SOFA_SET' },
  { label: 'Recliner', value: 'CAT_RECLINER' }
];

function toLocalDateTimeValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState<NewLeadForm>({
    ...initialForm,
    visitDatetime: toLocalDateTimeValue(new Date())
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const setField = (key: keyof NewLeadForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (!form.visitDatetime.trim()) nextErrors.visitDatetime = 'Visit date/time is required.';
    if (!form.storeId.trim()) nextErrors.storeId = 'Store is required.';
    if (!form.salesId.trim()) nextErrors.salesId = 'Sales is required.';
    if (!form.source.trim()) nextErrors.source = 'Source is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError('');
    setSavedMessage('');

    if (!validate()) return;

    setSaving(true);
    try {
      const normalized = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim()])
      ) as NewLeadForm;

      const payload = {
        ...normalized,
        customerName: normalized.customerName || null,
        phone: normalized.phone || null,
        lineId: normalized.lineId || null,
        interestedModelCode: normalized.interestedModelCode || null,
        priceRangeCode: normalized.priceRangeCode || null,
        usageTimingCode: normalized.usageTimingCode || null,
        residenceTypeCode: normalized.residenceTypeCode || null,
        customerGroupCode: normalized.customerGroupCode || null,
        ageRangeCode: normalized.ageRangeCode || null,
        customerLocation: normalized.customerLocation || null,
        firstQuestion: normalized.firstQuestion || null,
        customerTypeFlagCode: normalized.customerTypeFlagCode || null,
        interestedProductCategoryCode: normalized.interestedProductCategoryCode || null,
        note: normalized.note || null
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(errorPayload?.error?.message || 'Failed to save lead');
      }

      const saved = (await response.json()) as { id: string };
      setSavedMessage('Lead saved successfully. Opening lead details in a moment...');
      setTimeout(() => router.push(`/leads/${saved.id}`), 1400);
    } catch (error) {
      setApiError((error as Error).message || 'Unable to save lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F0E6] px-4 py-5 font-sans text-[#2E2E2E] md:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-28">
        <PageHeader />

        <form id="new-lead-form" onSubmit={onSubmit} className="flex flex-col gap-4">
          <SectionCard>
            <FormSectionTitle title="Visit Info" subtitle="Required for quick save" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <DateTimeInput label="Visit Date & Time" value={form.visitDatetime} onChange={(v) => setField('visitDatetime', v)} required />
                <InlineError message={errors.visitDatetime} />
              </div>
              <div>
                <SelectInput label="Store" value={form.storeId} onChange={(v) => setField('storeId', v)} options={storeOptions} required />
                <InlineError message={errors.storeId} />
              </div>
              <div>
                <SelectInput label="Sales" value={form.salesId} onChange={(v) => setField('salesId', v)} options={salesOptions} required />
                <InlineError message={errors.salesId} />
              </div>
              <div>
                <SelectInput label="Source" value={form.source} onChange={(v) => setField('source', v)} options={sourceOptions} required />
                <InlineError message={errors.source} />
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <FormSectionTitle title="Customer Info" />
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label="Customer Name" value={form.customerName} onChange={(v) => setField('customerName', v)} />
              <TextInput label="Phone" value={form.phone} onChange={(v) => setField('phone', v)} />
              <TextInput label="LINE ID" value={form.lineId} onChange={(v) => setField('lineId', v)} />
            </div>
          </SectionCard>

          <SectionCard>
            <FormSectionTitle title="Qualification" />
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label="Interested Model" value={form.interestedModelCode} onChange={(v) => setField('interestedModelCode', v)} />
              <SelectInput label="Price Range" value={form.priceRangeCode} onChange={(v) => setField('priceRangeCode', v)} options={priceRangeOptions} />
              <SelectInput label="Usage Timing" value={form.usageTimingCode} onChange={(v) => setField('usageTimingCode', v)} options={usageTimingOptions} />
              <SelectInput label="Residence Type" value={form.residenceTypeCode} onChange={(v) => setField('residenceTypeCode', v)} options={residenceTypeOptions} />
              <SelectInput label="Customer Group" value={form.customerGroupCode} onChange={(v) => setField('customerGroupCode', v)} options={customerGroupOptions} />
              <SelectInput label="Age Range" value={form.ageRangeCode} onChange={(v) => setField('ageRangeCode', v)} options={ageRangeOptions} />
              <TextInput label="Customer Location" value={form.customerLocation} onChange={(v) => setField('customerLocation', v)} />
              <TextInput label="First Question" value={form.firstQuestion} onChange={(v) => setField('firstQuestion', v)} />
              <SelectInput label="Customer Type" value={form.customerTypeFlagCode} onChange={(v) => setField('customerTypeFlagCode', v)} options={customerTypeFlagOptions} />
              <SelectInput
                label="Interested Product Category"
                value={form.interestedProductCategoryCode}
                onChange={(v) => setField('interestedProductCategoryCode', v)}
                options={interestedProductCategoryOptions}
              />
            </div>
          </SectionCard>

          <SectionCard>
            <FormSectionTitle title="Note" />
            <TextArea label="Note" value={form.note} onChange={(v) => setField('note', v)} placeholder="Any context to help follow-up later" />
          </SectionCard>

          {apiError ? <div className="rounded-xl border border-[#E5CFCF] bg-[#FFF6F6] px-3 py-2 text-sm text-[#9A4444]">{apiError}</div> : null}
          {savedMessage ? <div className="rounded-xl border border-[#CCE0C8] bg-[#EEF8EC] px-3 py-2 text-sm text-[#355F32]">{savedMessage}</div> : null}
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[#DCCFBF] bg-[#F5F0E6] p-3 md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex w-full max-w-3xl gap-2">
          <SecondaryButton href="/leads" label="Cancel" className="flex-1" />
          <PrimaryButton type="submit" form="new-lead-form" disabled={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save Lead'}
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}

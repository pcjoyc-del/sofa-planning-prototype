import Link from 'next/link';
import { IdentityBadge } from './IdentityBadge';
import { StatusBadge } from './StatusBadge';
import { LeadListItem } from './types';

export function LeadTable({ leads }: { leads: LeadListItem[] }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-[#E3D8C8] bg-white md:block">
      <table className="min-w-full text-sm">
        <thead className="bg-[#F0E8DC] text-left text-xs uppercase tracking-wide text-[#5B5349]">
          <tr>
            {['Customer', 'Phone', 'Source', 'Store', 'Sales', 'Visit', 'Status', 'Identity'].map((head) => (
              <th key={head} className="px-3 py-3 font-semibold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-[#EFE6DA] text-[#2E2E2E]">
              <td className="px-3 py-3 font-medium">
                <Link href={`/leads/${lead.id}`} className="hover:text-[#6B4F3A]">
                  {lead.customerName || 'Unnamed lead'}
                </Link>
              </td>
              <td className="px-3 py-3">{lead.phone || '-'}</td>
              <td className="px-3 py-3">{lead.source}</td>
              <td className="px-3 py-3">{lead.storeId}</td>
              <td className="px-3 py-3">{lead.salesId}</td>
              <td className="px-3 py-3">{new Date(lead.visitDatetime).toLocaleDateString()}</td>
              <td className="px-3 py-3"><StatusBadge status={lead.status} /></td>
              <td className="px-3 py-3"><IdentityBadge status={lead.identityStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

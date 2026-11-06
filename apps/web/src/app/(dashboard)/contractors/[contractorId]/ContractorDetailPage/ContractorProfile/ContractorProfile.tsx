import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { tradeCategoryLabel } from '@/lib/tradeCategories';
import type { ContractorDetail } from '../types';

const CARD_HEADING = 'text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3';

/** The contractor's trade categories, service area and contact details, side by side. */
export default function ContractorProfile({ contractor }: { contractor: ContractorDetail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card className="p-5">
        <h2 className={CARD_HEADING}>Details</h2>
        <div className="space-y-4">
          <div>
            <span className="text-xs text-gray-400 block mb-1.5">Categories</span>
            <div className="flex flex-wrap gap-1.5">
              {contractor.categories.map((category) => (
                <Badge className="bg-blue-50 text-blue-700" key={category}>
                  {tradeCategoryLabel(category)}
                </Badge>
              ))}
            </div>
          </div>
          {contractor.zipCodes.length > 0 && (
            <div>
              <span className="text-xs text-gray-400 block mb-1.5">Zip Codes Serviced</span>
              <div className="flex flex-wrap gap-1.5">
                {contractor.zipCodes.map((zipCode) => (
                  <Badge className="bg-gray-100 text-gray-600" key={zipCode}>{zipCode}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className={CARD_HEADING}>Contact</h2>
        <div className="space-y-2 text-sm">
          {contractor.email && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-14 shrink-0">Email</span>
              <a className="text-blue-600 hover:text-blue-700 truncate" href={`mailto:${contractor.email}`}>
                {contractor.email}
              </a>
            </div>
          )}
          {contractor.phone && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-14 shrink-0">Phone</span>
              <a className="text-gray-900" href={`tel:${contractor.phone}`}>{contractor.phone}</a>
            </div>
          )}
          {!contractor.email && !contractor.phone && <p className="text-gray-400">No contact info on file</p>}
          {contractor.notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400 block mb-1">Notes</span>
              <p className="text-gray-600">{contractor.notes}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

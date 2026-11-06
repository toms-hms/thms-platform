import Input from '@/components/ui/Input';
import Selector from '@/components/ui/Selector';
import { TRADE_CATEGORY_OPTIONS } from '@/lib/tradeCategories';
import type { ContractorFilterValues } from '../types';

const CATEGORY_OPTIONS = [{ label: 'All categories', value: '' }, ...TRADE_CATEGORY_OPTIONS];

interface ContractorFiltersProps {
  onChange: (value: ContractorFilterValues) => void;
  value: ContractorFilterValues;
}

/** The search box, trade category and ZIP code that narrow the directory. */
export default function ContractorFilters({ onChange, value }: ContractorFiltersProps) {
  function update(field: keyof ContractorFilterValues, fieldValue: string) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <div className="flex flex-wrap gap-3 mb-5">
      <Input
        className="max-w-xs"
        onChange={(e) => update('search', e.target.value)}
        placeholder="Search by name, company, email..."
        type="text"
        value={value.search}
      />
      <div className="w-52">
        <Selector
          onChange={(category) => update('tradeCategory', category)}
          options={CATEGORY_OPTIONS}
          placeholder="All categories"
          value={value.tradeCategory}
        />
      </div>
      <Input
        className="max-w-32"
        onChange={(e) => update('zipCode', e.target.value)}
        placeholder="ZIP"
        type="text"
        value={value.zipCode}
      />
    </div>
  );
}

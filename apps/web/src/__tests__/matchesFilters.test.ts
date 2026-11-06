import { matchesFilters } from '@/app/(dashboard)/jobs/JobsPage/matchesFilters';
import type { JobRow } from '@/app/(dashboard)/jobs/JobsPage/types';

const job = {
  category: 'PLUMBING',
  createdAt: '2026-01-01',
  home: { id: 'h1', name: 'Lake House' },
  id: 'j1',
  status: 'DRAFT',
  title: 'Leaking faucet',
} as JobRow;

describe('matchesFilters', () => {
  it('matches search text in the title, home or category, ignoring case', () => {
    expect(matchesFilters(job, { search: 'FAUCET', status: '' })).toBe(true);
    expect(matchesFilters(job, { search: 'lake', status: '' })).toBe(true);
    expect(matchesFilters(job, { search: 'plumb', status: '' })).toBe(true);
    expect(matchesFilters(job, { search: 'roof', status: '' })).toBe(false);
  });

  it('requires the status to match when one is chosen', () => {
    expect(matchesFilters(job, { search: '', status: 'DRAFT' })).toBe(true);
    expect(matchesFilters(job, { search: 'faucet', status: 'COMPLETED' })).toBe(false);
  });
});

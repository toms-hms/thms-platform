import { clearableText, optionalText, stateCode, zipCodeList } from '@/lib/formFields';

describe('formFields', () => {
  it('optionalText turns a blank into undefined, so the API leaves the field alone', () => {
    expect(optionalText.parse('   ')).toBeUndefined();
    expect(optionalText.parse(' note ')).toBe('note');
  });

  it('clearableText turns a blank into null, so an edit clears the field', () => {
    expect(clearableText.parse('')).toBeNull();
  });

  it('stateCode uppercases a 2-letter code and rejects anything else', () => {
    expect(stateCode.parse('tx')).toBe('TX');
    expect(stateCode.safeParse('Texas').success).toBe(false);
  });

  it('zipCodeList splits, trims and validates a comma-separated list', () => {
    expect(zipCodeList.parse('78701, 78702,')).toEqual(['78701', '78702']);
    expect(zipCodeList.safeParse('787').success).toBe(false);
  });
});

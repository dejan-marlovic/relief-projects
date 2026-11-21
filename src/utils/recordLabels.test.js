import { namedReference, transactionReference } from './recordLabels';
it('allows financial records to use their reference without a name', () => {
  expect(namedReference('Payment order', 12)).toBe('Payment order #12');
  expect(namedReference('transaction', 7)).toBe('transaction #7');
  expect(transactionReference({id:7, projectName:'Riverbend'})).toBe('Transaction #7');
});
it('retains supplied names and missing-name guidance for named records', () => {
  expect(namedReference('budget', 3, 'Water repairs')).toBe('Water repairs · budget #3');
  expect(namedReference('budget', 3)).toBe('Name unavailable · budget #3');
});

import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecordCard, { RecordCardActions } from './RecordCard';

test('preserves list semantics, refs, metadata and action behavior', () => {
 const ref = createRef(), open = jest.fn();
 render(<ul><RecordCard as="li" ref={ref} type="finding" label="Finding" data-mobile-tile="Backup support"><h3>Backup support</h3><RecordCardActions><button onClick={open}>Open record</button><button disabled>Delete record</button></RecordCardActions></RecordCard></ul>);
 expect(ref.current).toBe(screen.getByRole('listitem'));
 expect(ref.current).toHaveAttribute('data-record-item', 'card');
 expect(ref.current).toHaveAttribute('data-mobile-tile', 'Backup support');
 expect(screen.getByRole('button', {name:'Open record'}).parentElement).toHaveAttribute('data-action-group', 'section');
 fireEvent.click(screen.getByRole('button', {name:'Open record'}));
 expect(open).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('button', {name:'Delete record'})).toBeDisabled();
});
test('viewing marker precedes type and detail content without extra wrappers', () => {
 const {rerender} = render(<RecordCard as="section" variant="detail" viewing type="indicator" label="Indicator" aria-label="Indicator details"><h3>Water points</h3></RecordCard>);
 const panel=screen.getByRole('region', {name:'Indicator details'});
 expect(panel).toHaveAttribute('data-open-record','true');
 expect(panel).not.toHaveAttribute('data-record-item');
 expect(panel.children[0]).toHaveTextContent('Viewing record');
 expect(panel.children[1]).toHaveTextContent('Indicator');
 rerender(<RecordCard as="section" variant="detail" aria-label="Indicator details"><h3>Water points</h3></RecordCard>);
 expect(panel).not.toHaveAttribute('data-open-record');
 expect(screen.queryByText('Viewing record')).not.toBeInTheDocument();
});

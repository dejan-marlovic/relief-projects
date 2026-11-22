import React, { createRef } from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import FilterPanel from './FilterPanel';
test('preserves form behavior, ref and filter field state', () => {
 const ref=createRef(), submit=jest.fn(e=>e.preventDefault());
 render(<FilterPanel as="form" ref={ref} title="Filter records" guidance="Choose a state." onSubmit={submit}><label>State<select defaultValue="open"><option value="open">Open</option><option value="all">All</option></select></label><button type="submit">Apply</button></FilterPanel>);
 expect(ref.current.tagName).toBe('FORM');
 fireEvent.change(screen.getByLabelText('State'),{target:{value:'all'}});
 fireEvent.click(screen.getByText('Show filter records'));
 expect(screen.getByText('Choose a state.')).toBeVisible();
 expect(submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Apply'));expect(submit).toHaveBeenCalledTimes(1);
 expect(screen.getByLabelText('State')).toHaveValue('all');
});

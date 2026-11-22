import {render, screen, fireEvent, within} from '@testing-library/react';
import ColumnFilter from './ColumnFilter';
test('shared panel preserves portal interaction, applying and clearing filters', () => {
 const apply=jest.fn(), clear=jest.fn();
 render(<ColumnFilter label="Name" type="text" value="" onApply={apply} onClear={clear} />);
 fireEvent.click(screen.getByRole('button',{name:'Filter Name'}));
 const dialog=screen.getByRole('dialog',{name:'Filter Name'});
 expect(dialog.firstElementChild).toHaveTextContent('Filter Name');
 fireEvent.change(within(dialog).getByLabelText('Contains'),{target:{value:'Riverbend'}});
 fireEvent.click(within(dialog).getByText('Apply'));
 expect(apply).toHaveBeenCalledWith('Riverbend');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Filter Name'}));
 fireEvent.click(screen.getByText('Clear'));expect(clear).toHaveBeenCalledTimes(1);
});

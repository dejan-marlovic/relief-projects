import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadAndAttach, { UploadDropzone } from './UploadAndAttach';
test('upload starts compact and keeps metadata mounted when closed', () => {
 render(<UploadAndAttach><label>Category<input defaultValue="Draft" /></label></UploadAndAttach>);
 const summary=screen.getByText('Upload and attach').closest('summary');
 expect(summary.parentElement).not.toHaveAttribute('open');
 fireEvent.click(summary);
 expect(summary.parentElement).toHaveAttribute('open');
 fireEvent.change(screen.getByLabelText('Category'), {target:{value:'Finance'}});
 fireEvent.click(summary);
 fireEvent.click(summary);
 expect(screen.getByLabelText('Category')).toHaveValue('Finance');
});
test('picker preserves native disabled behavior and does not submit its parent form', () => {
 const click=jest.fn(), submit=jest.fn();
 const {rerender}=render(<form onSubmit={submit}><UploadDropzone onClick={click}>Choose file</UploadDropzone></form>);
 fireEvent.click(screen.getByRole('button'));
 expect(click).toHaveBeenCalledTimes(1); expect(submit).not.toHaveBeenCalled();
 rerender(<UploadDropzone disabled onClick={click}>Choose file</UploadDropzone>);
 fireEvent.click(screen.getByRole('button')); expect(click).toHaveBeenCalledTimes(1);
});

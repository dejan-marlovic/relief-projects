import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import ReadState, {EmptyState, ErrorState, LoadingState} from './ReadState';
test('initial loading is announced but refreshes retain content without a loading message', () => {
 const {rerender}=render(<ReadState state={{loading:true,data:null}} />);
 expect(screen.getByRole('status')).toHaveTextContent('Loading');
 rerender(<><ReadState state={{loading:true,data:[]}} /><p>Previously loaded records</p></>);
 expect(screen.queryByRole('status')).not.toBeInTheDocument();
 expect(screen.getByText('Previously loaded records')).toBeVisible();
});
test('read failure preserves its retry callback and disables retries while busy', () => {
 const retry=jest.fn();
 const {rerender}=render(<ReadState state={{loading:false,data:[],error:'Could not refresh',retry}} />);
 expect(screen.getByRole('alert')).toHaveTextContent('Could not refresh');fireEvent.click(screen.getByText('Retry'));expect(retry).toHaveBeenCalledTimes(1);
 rerender(<ReadState state={{loading:true,data:[],error:'Could not refresh',retry}} />);
 expect(screen.getByRole('button')).toBeDisabled();expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
test('presentation primitives preserve host elements, classes and custom actions', () => {
 render(<><EmptyState as="div" className="empty">No matching documents.</EmptyState><ErrorState as="span" id="field-error">Date required</ErrorState><LoadingState>Loading attachments…</LoadingState></>);
 expect(screen.getByText('No matching documents.').tagName).toBe('DIV');expect(screen.getByText('No matching documents.')).toHaveClass('empty');expect(screen.getByRole('alert')).toHaveAttribute('id','field-error');expect(screen.getByRole('status')).toHaveTextContent('Loading attachments');
});

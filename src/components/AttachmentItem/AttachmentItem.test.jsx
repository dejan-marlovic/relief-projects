import React, {createRef} from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import AttachmentItem from './AttachmentItem';
test('keeps filename, availability and native actions accessible in a list', () => {
 const ref=createRef(), download=jest.fn();
 render(<ul><AttachmentItem ref={ref}><strong>Agreement.pdf · Version 1</strong><p>Newer version exists; this link retains version 1.</p><div data-action-group="section"><button onClick={download}>Download</button><button disabled>Remove link</button></div></AttachmentItem></ul>);
 expect(ref.current).toBe(screen.getByRole('listitem'));
 expect(screen.getByText(/Newer version exists/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Download'}));expect(download).toHaveBeenCalledTimes(1);
 expect(screen.getByRole('button',{name:'Remove link'})).toBeDisabled();
});

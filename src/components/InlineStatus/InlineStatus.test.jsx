import React from 'react';
import {render, screen} from '@testing-library/react';
import InlineStatus from './InlineStatus';
test('keeps status text accessible while save state changes', () => {
 const {rerender}=render(<InlineStatus tone="pending">Saving…</InlineStatus>);
 expect(screen.getByRole('status')).toHaveTextContent('Saving…');
 expect(screen.getByRole('status').querySelector('svg')).toHaveAttribute('aria-hidden','true');
 rerender(<InlineStatus tone="success">Saved</InlineStatus>);
 expect(screen.getByRole('status')).toHaveTextContent('Saved');
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

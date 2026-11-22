import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import RecordExcerpt from './RecordExcerpt';
test('shows short content directly and exposes long text on demand', () => {
 const {rerender}=render(<RecordExcerpt text="Confirm support" />);
 expect(screen.getByText(/Confirm support/)).toBeVisible();
 expect(screen.queryByText('Read full description')).not.toBeInTheDocument();
 const full='A detailed description that exceeds the preview length.';
 rerender(<RecordExcerpt text={full} limit={12} />);
 expect(screen.getByText(/A detailed d…/)).toBeVisible();
 const content=screen.getByText(full);expect(content).not.toBeVisible();
 fireEvent.click(screen.getByText('Read full description'));expect(content).toBeVisible();
});

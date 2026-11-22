import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import RecordHeader from './RecordHeader';
import {RecordCardActions} from '../RecordCard/RecordCard';
test('preserves heading, status and action order and handlers', () => {
 const open=jest.fn();
 render(<RecordHeader as="header"><h3>Water points</h3><span>Open</span><RecordCardActions placement="header"><button onClick={open}>Open record</button><button disabled>Delete record</button></RecordCardActions></RecordHeader>);
 expect(screen.getByRole('heading',{name:'Water points'})).toBeVisible();
 const buttons=screen.getAllByRole('button');expect(buttons[0]).toHaveTextContent('Open record');expect(buttons[1]).toBeDisabled();fireEvent.click(buttons[0]);expect(open).toHaveBeenCalledTimes(1);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GuidanceNote from './GuidanceNote';

test('guidance can be hidden and restored without submitting its form or losing focus', () => {
  const submit = jest.fn();
  render(<form onSubmit={submit}><GuidanceNote title="Filter guidance">Choose a project.</GuidanceNote></form>);
  expect(screen.queryByText('Choose a project.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', {name:'Show filter guidance'})).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', {name:'Show filter guidance'}));
  fireEvent.click(screen.getByRole('button', {name:'Hide filter guidance'}));
  expect(screen.queryByText('Choose a project.')).not.toBeInTheDocument();
  const show = screen.getByRole('button', {name:'Show filter guidance'});
  expect(show).toHaveFocus();
  fireEvent.click(show);
  expect(screen.getByText('Choose a project.')).toBeVisible();
  expect(screen.getByRole('button', {name:'Hide filter guidance'})).toHaveFocus();
  expect(submit).not.toHaveBeenCalled();
});

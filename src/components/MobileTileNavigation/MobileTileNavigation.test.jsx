import React, { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MobileTileNavigation from './MobileTileNavigation';
function Harness() {
 const rootRef = useRef(null);
 return <><main ref={rootRef}><section data-mobile-tile="First"><input aria-label="Draft" defaultValue="Keep me" /><p>First content</p><div data-swipe-scope="memos">Memo content</div></section><section data-mobile-tile="Second"><p>Second content</p></section></main><MobileTileNavigation rootRef={rootRef} route="test" /></>;
}
let scroll;
beforeEach(() => {
 jest.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{}]);
 jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function() { const top = this.getAttribute('data-mobile-tile') === 'Second' ? 900 : 24; return {top, bottom: top + 600}; });
 scroll = jest.fn(); Element.prototype.scrollIntoView = scroll;
 window.matchMedia = jest.fn(() => ({matches:false}));
});
afterEach(() => jest.restoreAllMocks());
function swipe(target) {
 fireEvent.touchStart(target, {touches:[{identifier:1,clientX:300,clientY:100}]});
 fireEvent.touchEnd(target, {touches:[],changedTouches:[{identifier:1,clientX:100,clientY:100}]});
}
test('swipes move to the next card while keeping drafts mounted and respecting boundaries', () => {
 render(<Harness />);
 expect(screen.getByRole('button',{name:'Previous card'})).toBeDisabled();
 swipe(screen.getByText('First content'));
 expect(scroll.mock.instances[0]).toBe(screen.getByText('Second content').parentElement);
 expect(screen.getByLabelText('Draft')).toHaveValue('Keep me');
 expect(screen.getByRole('button',{name:'Next card'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Previous card'}));
 expect(scroll).toHaveBeenCalledTimes(2);
});
test('memo scope and form inputs do not trigger outer card navigation', () => {
 render(<Harness />);
 swipe(screen.getByText('Memo content'));
 swipe(screen.getByLabelText('Draft'));
 expect(scroll).not.toHaveBeenCalled();
});

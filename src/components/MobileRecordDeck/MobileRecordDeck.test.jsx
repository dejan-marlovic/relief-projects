import React, {useState} from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import MobileRecordDeck from './MobileRecordDeck';
import useMediaQuery from '../../hooks/useMediaQuery';
jest.mock('../../hooks/useMediaQuery');
function Record({name}) { const [draft,setDraft]=useState(''); return <section><p>{name}</p><input aria-label={`${name} draft`} value={draft} onChange={e=>setDraft(e.target.value)} /></section>; }
function Deck({ids=['A','B','C'],locked=false,creating=false}) {return <MobileRecordDeck label="Transaction" locked={locked} creating={creating}>{ids.map(id=><Record key={id} name={id} />)}</MobileRecordDeck>;}
function swipe(target) {fireEvent.touchStart(target,{touches:[{identifier:1,clientX:300,clientY:100}]});fireEvent.touchEnd(target,{touches:[],changedTouches:[{identifier:1,clientX:100,clientY:100}]});}
beforeEach(()=>{useMediaQuery.mockReturnValue(true);Element.prototype.scrollIntoView=jest.fn();});
test('mobile displays one complete record and swipes without discarding drafts',()=>{
 render(<Deck/>);
 expect(screen.getByText('A')).toBeVisible();expect(screen.getByText('B')).not.toBeVisible();
 fireEvent.change(screen.getByLabelText('A draft'),{target:{value:'kept'}});
 swipe(screen.getByText('A'));
 expect(screen.getByText('A')).not.toBeVisible();expect(screen.getByText('B')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Previous transaction'}));
 expect(screen.getByLabelText('A draft')).toHaveValue('kept');
 expect(screen.getByRole('button',{name:'Previous transaction'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Next transaction'}));fireEvent.click(screen.getByRole('button',{name:'Next transaction'}));
 expect(screen.getByRole('button',{name:'Next transaction'})).toBeDisabled();
 swipe(screen.getByText('C'));expect(screen.getByText('C')).toBeVisible();
});
test('filtering or deleting the current record selects a valid remaining record',()=>{
 const view=render(<Deck/>);fireEvent.click(screen.getByRole('button',{name:'Next transaction'}));
 view.rerender(<Deck ids={['C']}/>);expect(screen.getByText('C')).toBeVisible();expect(screen.getByText('Transaction 1 of 1')).toBeVisible();
});
test('editing locks navigation and new forms hide existing records',()=>{
 const view=render(<Deck locked/>);swipe(screen.getByText('A'));expect(screen.getByText('A')).toBeVisible();expect(screen.getByRole('button',{name:'Next transaction'})).toBeDisabled();
 view.rerender(<Deck creating/>);expect(screen.getByText('A')).not.toBeVisible();
});
test('desktop shows all records and no record navigation',()=>{
 useMediaQuery.mockReturnValue(false);render(<Deck/>);expect(screen.getByText('A')).toBeVisible();expect(screen.getByText('B')).toBeVisible();expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});
test('nested record details stay with the selected record',()=>{
 render(<MobileRecordDeck label="Payment order"><React.Fragment key="1"><p>Order one</p><p>Order one lines</p></React.Fragment><React.Fragment key="2"><p>Order two</p><p>Order two lines</p></React.Fragment></MobileRecordDeck>);
 fireEvent.click(screen.getByRole('button',{name:'Next payment order'}));expect(screen.getByText('Order one lines')).not.toBeVisible();expect(screen.getByText('Order two lines')).toBeVisible();
});

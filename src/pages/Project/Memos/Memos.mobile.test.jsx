import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import Memos from './Memos';
import {ProjectContext} from '../../../context/ProjectContext';
import useMediaQuery from '../../../hooks/useMediaQuery';
import {appFetch} from '../../../utils/appFetch';
jest.mock('../../../hooks/useMediaQuery');
jest.mock('../../../utils/appFetch', () => ({appFetch:jest.fn()}));
jest.mock('../../../context/UnsavedChangesContext', () => ({useUnsavedChange:jest.fn()}));
beforeEach(() => {
 useMediaQuery.mockReturnValue(true);
 appFetch.mockImplementation(async url => ({ok:true,json:async()=>url.includes('/memos/') ? [{id:1,projectId:1,message:'First memo'},{id:2,projectId:1,message:'Second memo'}] : []}));
});
test('mobile shows one memo at a time with bounded buttons and swipes', async () => {
 render(<ProjectContext.Provider value={{selectedProjectId:1}}><Memos /></ProjectContext.Provider>);
 const first=await screen.findByText('First memo');
 expect(screen.queryByText('Second memo')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Previous memo'})).toBeDisabled();
 fireEvent.touchStart(first,{touches:[{identifier:1,clientX:300,clientY:100}]});
 fireEvent.touchEnd(first,{touches:[],changedTouches:[{identifier:1,clientX:100,clientY:100}]});
 expect(screen.getByText('Second memo')).toBeInTheDocument();
 expect(screen.queryByText('First memo')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Next memo'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Previous memo'}));
 expect(screen.getByText('First memo')).toBeInTheDocument();
});
test('desktop retains all memos', async () => {
 useMediaQuery.mockReturnValue(false);
 render(<ProjectContext.Provider value={{selectedProjectId:1}}><Memos /></ProjectContext.Provider>);
 expect(await screen.findByText('First memo')).toBeInTheDocument();
 expect(screen.getByText('Second memo')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Next memo'})).not.toBeInTheDocument();
});

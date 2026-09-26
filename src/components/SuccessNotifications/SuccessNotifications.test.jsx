import { act, fireEvent, render, screen } from "@testing-library/react";
import SuccessNotifications from "./SuccessNotifications";
import { notifySuccess } from "../../utils/successNotifications";
beforeEach(()=>jest.useFakeTimers());afterEach(()=>jest.useRealTimers());
test("success messages dismiss automatically or manually without taking focus",()=>{
 render(<><button>Save</button><SuccessNotifications/></>);
 screen.getByText("Save").focus();
 act(()=>notifySuccess("Budget saved."));expect(screen.getByText("Budget saved.")).toBeInTheDocument();expect(screen.getByText("Save")).toHaveFocus();
 act(()=>jest.advanceTimersByTime(5000));expect(screen.queryByText("Budget saved.")).not.toBeInTheDocument();
 act(()=>notifySuccess("Signed in."));fireEvent.click(screen.getByLabelText("Dismiss notification"));expect(screen.queryByText("Signed in.")).not.toBeInTheDocument();
});
test("hover pauses dismissal and duplicates are coalesced",()=>{
 render(<SuccessNotifications/>);act(()=>{notifySuccess("Saved.");notifySuccess("Saved.");});
 expect(screen.getAllByText("Saved.")).toHaveLength(1);
 fireEvent.mouseEnter(screen.getByText("Saved."));act(()=>jest.advanceTimersByTime(10000));expect(screen.getByText("Saved.")).toBeInTheDocument();
 fireEvent.mouseLeave(screen.getByText("Saved."));act(()=>jest.advanceTimersByTime(5000));expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
});

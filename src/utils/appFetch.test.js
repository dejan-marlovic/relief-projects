import { appFetch, mutationNotice } from "./appFetch";
import { subscribeSuccess } from "./successNotifications";
test("only successful mutations to our API produce notifications",()=>{
 const ok={ok:true,status:200};
 expect(mutationNotice("/api/budgets/2",{method:"PUT"},ok)).toBe("Budget changes saved.");
 expect(mutationNotice("/api/projects/2/follow-ups",{method:"POST"},ok)).toBe("Follow-up changes saved.");
 expect(mutationNotice("/api/projects/2/risks/9/reopen",{method:"POST"},ok)).toBe("Risk reopened.");
 expect(mutationNotice("/api/projects/2/risks/9/close",{method:"POST"},ok)).toBe("Risk closed.");
 expect(mutationNotice("/api/projects/2/risks/9/restore",{method:"PUT"},ok)).toBe("Risk restored.");
 expect(mutationNotice("/api/projects/2/risks/9",{method:"DELETE"},ok)).toBe("Risk removed.");
 expect(mutationNotice("/api/budgets/2/currency-conversion/preview",{method:"POST"},ok)).toBeNull();
 expect(mutationNotice("/api/auth/login",{method:"POST"},ok)).toBeNull();
 expect(mutationNotice("/api/documents/3",{},ok)).toBeNull();
 expect(mutationNotice("/api/documents/3",{method:"DELETE"},{ok:false,status:409})).toBeNull();
 expect(mutationNotice("https://other.example/api/documents",{method:"POST"},ok)).toBeNull();
 expect(mutationNotice("/api/transactions/bulk-delete",{method:"POST"},ok)).toBeNull();
 expect(mutationNotice("/api/documents/3/replace",{method:"POST"},ok)).toBe("Document replacement uploaded.");
 expect(mutationNotice("/api/documents/3/status",{method:"PUT"},ok)).toBe("Document changes saved.");
});
test("wrapper leaves the response body untouched and propagates failures",async()=>{
 const listener=jest.fn();const unsubscribe=subscribeSuccess(listener);
 const response={ok:true,status:201,json:jest.fn()};global.fetch=jest.fn().mockResolvedValueOnce(response).mockRejectedValueOnce(new Error("offline"));
 expect(await appFetch("/api/recipients",{method:"POST"})).toBe(response);
 expect(listener).toHaveBeenCalledWith("Recipient created.");expect(response.json).not.toHaveBeenCalled();
 await expect(appFetch("/api/recipients",{method:"POST"})).rejects.toThrow("offline");
 expect(listener).toHaveBeenCalledTimes(1);unsubscribe();
});

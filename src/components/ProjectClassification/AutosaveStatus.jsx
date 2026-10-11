import React from "react";

const labels = { organizationId: "Organisation", organizationStatusId: "Organisation role", bankName: "Bank name", accountNumber: "Account number", branchName: "Branch", swiftCode: "SWIFT", street: "Street", city: "City", state: "State", postalCode: "Postal code", country: "Country", projectName: "Project name", projectCode: "Project code", refProjectNo: "Reference number", pinCode: "PIN code", foSupportCostPercent: "FO support cost", irwSupportCostPercent: "Own support cost", projectNameSv: "Swedish title", projectNameEn: "English title", targetGroupDescription: "Target group", operatingCountryCodes: "Operating countries", projectCoverImageCaption: "Picture captions", projectCoverImage: "Picture list", projectDescription: "Description", projectStatusId: "Project status", projectTypeId: "Project type", addressId: "Address", partOfId: "Parent project", projectPeriodMonths: "Period in months", projectDate: "Project date", projectStart: "Start date", projectEnd: "End date", projectStartRev: "Revised start", projectEndRev: "Revised end" };
export default function AutosaveStatus({ save }) {
  return <div aria-live="polite">
    {save.message && !save.error && <p role="status">{save.message}</p>}
    {save.error && <><p role="alert">{save.error}</p>
      {save.conflicts && <><p>Currently saved values:</p><ul>{Object.entries(save.conflicts).map(([key, value]) => <li key={key}>{labels[key] || key}: {String(value ?? "Not recorded")}</li>)}</ul></>}
      {save.conflicts?.projectCoverImage !== undefined ? <p>The picture list changed. Copy your caption, reload the page and apply it to the correct picture.</p> : <button type="button" disabled={save.busy} onClick={save.conflicts ? save.acceptConflicts : save.retry}>{save.conflicts ? "Keep my edits and retry" : "Retry saving"}</button>}
    </>}
  </div>;
}

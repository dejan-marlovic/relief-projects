import { createContext } from "react";

export const OpenEditorState = createContext({ register: () => () => {}, editors: [] });

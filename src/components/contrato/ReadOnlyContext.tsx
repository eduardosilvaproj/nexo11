import { createContext, useContext } from "react";

export const ReadOnlyContext = createContext(false);

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}

import { createContext, useContext } from "react";

export type PageTitleContextValue = {
  title: string;
  setTitle: (title: string) => void;
};

export const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export const useCurrentPageTitle = () => useContext(PageTitleContext)?.title ?? "";

import { useContext, useEffect, useState, type ReactNode } from "react";

import { PageTitleContext } from "@/components/navigation/page-title-context";

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

// Shows the page's title in the top navigation bar, which renders it as the
// page's only <h1>, and clears it when the page unmounts.
export function PageTitle({ title }: { title: string }) {
  const setTitle = useContext(PageTitleContext)?.setTitle;

  useEffect(() => {
    if (!setTitle) return;
    setTitle(title);
    return () => setTitle("");
  }, [setTitle, title]);

  return null;
}

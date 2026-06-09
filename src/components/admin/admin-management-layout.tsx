import type { ReactNode } from "react";

type AdminManagementLayoutProps = {
  children: ReactNode;
};

export function AdminManagementLayout({ children }: AdminManagementLayoutProps) {
  return <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">{children}</div>;
}

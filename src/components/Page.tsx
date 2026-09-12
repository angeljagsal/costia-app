import type { ReactNode } from 'react';

export function Page({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {body ? <p className="page-sub">{body}</p> : null}
      </div>
      {children}
    </div>
  );
}

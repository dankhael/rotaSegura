import { LoaderCircle } from "lucide-react";

type AdminLoadingStateProps = {
  message: string;
};

export function AdminLoadingState({ message }: AdminLoadingStateProps) {
  return (
    <div className="grid min-h-[360px] place-items-center px-6 py-12 text-center">
      <div className="grid justify-items-center gap-3">
        <LoaderCircle className="size-6 animate-spin text-(--ink-3)" aria-hidden="true" />
        <p className="text-sm font-medium text-(--ink-3)" role="status">
          {message}
        </p>
      </div>
    </div>
  );
}

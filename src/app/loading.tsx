import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div className="gutter mx-auto flex max-w-[1120px] flex-col gap-4 pt-10">
      <Skeleton className="h-10 w-2/3" label="Loading page" />
      <Skeleton className="h-64 w-full rounded-panel" />
    </div>
  );
}

export default function Loading() {
    return (
      <div className="flex flex-col space-y-4 p-8">
        <div className="h-8 w-[200px] animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-[400px] animate-pulse rounded-xl bg-gray-100" />
          <div className="h-[400px] animate-pulse rounded-xl bg-gray-100" />
          <div className="h-[400px] animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }
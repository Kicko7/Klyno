export const LoadingSkeleton = () => {
  return (
    <div className="flex flex-col space-y-4">
      {[1, 2, 3, 4].map((_, idx) => (
        <div
          key={idx}
          className="h-5 w-3/4 animate-pulse rounded-lg bg-gray-300"
        />
      ))}
    </div>
  )
}

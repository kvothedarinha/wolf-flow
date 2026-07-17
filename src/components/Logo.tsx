const SIZES = {
  sm: "h-8 w-8 rounded-xl",
  md: "h-12 w-12 rounded-2xl",
} as const;

export function Logo({ size = "md" }: { size?: keyof typeof SIZES }) {
  return (
    <img
      src="/icons/icon-any-192.png"
      alt="Wolf Flow"
      className={`${SIZES[size]} object-cover shrink-0`}
    />
  );
}

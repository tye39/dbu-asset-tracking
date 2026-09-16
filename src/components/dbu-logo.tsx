import Image from "next/image";

export function DbuLogo({
  className = "w-16 h-16",
}: {
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/dbu-logo.png"
        alt="Debre Berhan University Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
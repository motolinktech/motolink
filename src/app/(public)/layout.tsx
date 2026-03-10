import Image from "next/image";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-2/3 bg-muted items-center justify-center relative">
        <Image src="/rio-de-janeiro.jpg" alt="Rio de Janeiro" className="object-cover" fill />
      </div>

      <div className="w-full lg:w-1/3 bg-background flex flex-col justify-center px-8 py-12">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <Image
            src="/motolink.png"
            alt="Logo da Motolink"
            width={256}
            height={163}
            className="mx-auto invert dark:invert-0"
          />

          {children}
        </div>
      </div>
    </div>
  );
}

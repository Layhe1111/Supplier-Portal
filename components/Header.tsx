import Image from 'next/image';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-4 w-fit">
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Project Pilot Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-2xl font-bold text-[#1a2332] tracking-tight">
            Project Pilot
          </span>
        </div>
      </div>
    </header>
  );
}

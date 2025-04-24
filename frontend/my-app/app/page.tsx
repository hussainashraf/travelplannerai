
import Link from "next/link";
import { BiTrip } from "react-icons/bi";


export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          {/* <Image
            src="/logo.png"
            alt="Trip Planner AI"
            width={40}
            height={40}
            className="w-10 h-10"
          /> */}
          <span className="text-xl text-gray-800 font-semibold">Trip Planner AI</span>
        </div>
        {/* <Link
          href="/community"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          Community Trips
        </Link> */}
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center text-center gap-10">
          {/* AI Assistant Avatar */}
          <div className="relative">
            {/* <div className="w-24 h-24 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center">
              <Image
                src="/avatar.png"
                alt="AI Assistant"
                width={80}
                height={80}
                className="rounded-full p-1"
              />
            </div> */}
            {/* <span className="text-3xl text-emerald-700 font-bold mt-1 block">
              NOVA
            </span> */}
          </div>

          {/* Hero Text */}
          <div className="space-y-6 max-w-3xl">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-gray-900 leading-tight">
              Your Next Journey,
              <br />
              <span className="text-emerald-700">Optimized</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Build, personalize, and optimize your dream itineraries with our intelligent AI trip planner. 
              Perfect for adventures, explorations, and memorable experiences.
            </p>
          </div>

          {/* CTA Button */}
          <Link href="/planner">
            <button className="group cursor-pointer relative inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-medium text-white transition-all duration-300 ease-in-out hover:scale-105">
              <span className="absolute inset-0 rounded-full bg-[#0B4619] border-[3px] border-white"></span>
              <span className="absolute -inset-1 rounded-full border-2 border-white"></span>
              <BiTrip className="relative w-6 h-6" />
              <span className="relative font-normal">Create a new trip</span>
            </button>
          </Link>
        </div>
      </main>

      {/* Features Section */}
    </div>
  );
}

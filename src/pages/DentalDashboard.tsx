import { MessageCircle } from "lucide-react";
import { DentalSidebar } from "@/components/dental/DentalSidebar";
import { DentalTopbar } from "@/components/dental/DentalTopbar";
import { DentalCalendar } from "@/components/dental/DentalCalendar";
import { DentalOnboardingCard } from "@/components/dental/DentalOnboardingCard";

export default function DentalDashboard() {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <DentalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DentalTopbar />
        <main className="flex-1 p-6">
          <DentalCalendar />
        </main>
      </div>
      <DentalOnboardingCard />
      <button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center z-30"
        aria-label="Suporte"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
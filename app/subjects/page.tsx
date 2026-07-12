import SubjectsChecklistView from "@/components/SubjectsChecklistView";
import SiteFooter from "@/components/SiteFooter";

export default function SubjectsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1e8] text-[#2b2118]">
      <main className="flex-1">
        <SubjectsChecklistView />
      </main>
      <SiteFooter />
    </div>
  );
}

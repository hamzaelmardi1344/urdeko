import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { LegalFooter } from "@/components/layout/LegalFooter";
import { TopAppBar } from "@/components/layout/TopAppBar";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopAppBar showMenu />
      {children}
      <LegalFooter />
      <BottomNavBar />
    </>
  );
}

import Sidebar from "@/components/sidebar";
import Titlebar from "@/components/titlebar";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
      <div className={`bg-background text-foreground h-screen`}>
        <Titlebar />
        <div className="flex h-[calc(100%-32px)]">
          <Sidebar />
          <div className="flex h-full w-[calc(100%-256px)]">
            {children}
          </div>
        </div>
      </div>
    )
}
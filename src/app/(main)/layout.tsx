import Sidebar from "@/components/sidebar";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
      <div className={`bg-background text-foreground`}>
        <Sidebar />
        {children}
      </div>
    )
}
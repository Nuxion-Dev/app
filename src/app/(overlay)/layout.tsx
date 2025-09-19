import './overlay.scss'

export default function OverlayLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
      <div className="bg-transparent text-foreground">
        {children}
      </div>
    )
}
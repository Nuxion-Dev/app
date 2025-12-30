import "./overlay.scss";

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-transparent min-h-screen w-full overflow-hidden">
      {children}
    </div>
  );
}

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
      <body className="bg-transparent text-foreground">
        {children}
      </body>
    )
}
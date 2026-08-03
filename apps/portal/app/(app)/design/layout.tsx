export default function DesignLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden md:-m-6 lg:-m-8">
      {children}
    </div>
  )
}

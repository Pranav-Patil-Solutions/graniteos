export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center px-5 bg-[radial-gradient(900px_500px_at_50%_-10%,#1c2630,#0b0e11_60%)]">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

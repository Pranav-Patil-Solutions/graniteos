import AuthScene from "@/components/auth/AuthScene";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthScene>{children}</AuthScene>;
}

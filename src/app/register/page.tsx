import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
export const metadata: Metadata = { title: "Tạo tài khoản", robots: { index: false, follow: false } };
export default function RegisterPage() {
  return <AuthForm mode="register" />;
}

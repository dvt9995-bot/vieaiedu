import type { Metadata } from "next";
import AccountClient from "@/components/AccountClient";

export const metadata: Metadata = { title: "Cài đặt tài khoản" };

export default function AccountPage() {
  return <AccountClient />;
}

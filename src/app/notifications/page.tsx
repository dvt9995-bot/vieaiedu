import type { Metadata } from "next";
import NotificationsClient from "@/components/NotificationsClient";
export const metadata: Metadata = { title: "Thông báo", robots: { index: false, follow: false } };
export default function NotificationsPage() {
  return <NotificationsClient />;
}

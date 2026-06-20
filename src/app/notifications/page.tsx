import type { Metadata } from "next";
import NotificationsClient from "@/components/NotificationsClient";
export const metadata: Metadata = { title: "Thông báo" };
export default function NotificationsPage() {
  return <NotificationsClient />;
}

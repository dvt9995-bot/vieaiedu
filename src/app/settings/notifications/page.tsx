import type { Metadata } from "next";
import SettingsNotifications from "@/components/SettingsNotifications";
export const metadata: Metadata = { title: "Cài đặt thông báo", robots: { index: false } };
export default function Page() {
  return <SettingsNotifications vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""} />;
}

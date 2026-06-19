import type { Metadata } from "next";
import DashboardClient from "@/components/DashboardClient";

export const metadata: Metadata = { title: "Học của tôi" };

export default function DashboardPage() {
  return <DashboardClient />;
}

import type { Metadata } from "next";
import { StartHere } from "@/components/start/StartHere";

export const metadata: Metadata = { title: "Start Here: C++ for Beginners", description: "Never programmed before? Do five short lessons, or take the 2-minute quiz to find where to start.", alternates: { canonical: "/start" } };

export default function StartPage() {
  return <StartHere />;
}

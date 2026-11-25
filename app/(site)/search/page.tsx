import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";

export const metadata: Metadata = { title: "Search", description: "Search all CC111 lessons." };

export default function SearchPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold">Search</h1>
      <SearchBox />
    </div>
  );
}

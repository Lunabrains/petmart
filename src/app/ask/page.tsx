import type { Metadata } from "next";

import { AskChat } from "@/components/ask/ask-chat";
import { PageTitle } from "@/components/common/page-title";
import { SUGGESTED_QUESTIONS } from "@/lib/ask";

export const metadata: Metadata = { title: "Ask" };

export default function AskPage() {
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageTitle title="Ask About Your Business" subtitle="Answers come from your own sales, stock and cost numbers. Nothing is made up." />
      <AskChat suggestions={SUGGESTED_QUESTIONS} />
    </div>
  );
}

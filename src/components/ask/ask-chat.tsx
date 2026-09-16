"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MessageCircleQuestion } from "lucide-react";

import { ask } from "@/app/ask/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Answer } from "@/lib/ask";
import { cn } from "@/lib/utils";

const MAX_QUESTION_LENGTH = 300;

const FAILED_ANSWER: Answer = {
  title: "Something Went Wrong",
  lines: ["The answer did not come back. Please ask again."],
};

interface Exchange {
  id: number;
  question: string;
  /** Null while we are waiting for the answer. */
  answer: Answer | null;
}

interface AskChatProps {
  suggestions: readonly string[];
}

export function AskChat({ suggestions }: AskChatProps) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);

  const asked = exchanges.length > 0;

  function submit(raw: string) {
    const clean = raw.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!clean || pending) return;
    const id = nextId.current++;
    setExchanges((list) => [...list, { id, question: clean, answer: null }]);
    setQuestion("");
    startTransition(async () => {
      let answer: Answer;
      try {
        answer = await ask(clean);
      } catch {
        answer = FAILED_ANSWER;
      }
      setExchanges((list) => list.map((e) => (e.id === id ? { ...e, answer } : e)));
    });
  }

  // Bring the newest question and its answer into view.
  useEffect(() => {
    latestRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [exchanges]);

  // Keep the cursor in the box so the owner can ask the next question straight away.
  useEffect(() => {
    if (asked && !pending) inputRef.current?.focus({ preventScroll: true });
  }, [asked, pending]);

  return (
    <div className="flex flex-col gap-6">
      {!asked && (
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-card px-5 py-10 text-center ring-1 ring-foreground/10 lg:px-8 lg:py-14">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-muted text-brand">
            <MessageCircleQuestion className="size-7" />
          </span>
          <p className="max-w-md text-lg leading-snug">Ask a question about sales, stock or profit. Answers use only your company data.</p>
          <SuggestionChips suggestions={suggestions} onPick={submit} disabled={pending} />
        </div>
      )}

      {exchanges.map((exchange, index) => (
        <div
          key={exchange.id}
          ref={index === exchanges.length - 1 ? latestRef : undefined}
          className="flex scroll-mt-18 flex-col gap-3 lg:scroll-mt-8"
        >
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-base leading-snug text-brand-foreground">{exchange.question}</p>
          </div>
          {exchange.answer ? (
            <AnswerCard answer={exchange.answer} />
          ) : (
            <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Thinking...
            </div>
          )}
        </div>
      ))}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
        className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10 lg:p-4"
      >
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question..."
            aria-label="Your question"
            maxLength={MAX_QUESTION_LENGTH}
            autoComplete="off"
            disabled={pending}
            className="h-11 px-3.5 text-base md:text-base"
          />
          <Button type="submit" size="lg" disabled={pending || question.trim().length === 0} className="h-11 px-5 text-base">
            Ask
          </Button>
        </div>
        {asked && <SuggestionChips suggestions={suggestions} onPick={submit} disabled={pending} small />}
      </form>
    </div>
  );
}

interface SuggestionChipsProps {
  suggestions: readonly string[];
  onPick: (question: string) => void;
  disabled?: boolean;
  small?: boolean;
}

function SuggestionChips({ suggestions, onPick, disabled, small }: SuggestionChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", small ? "justify-start" : "justify-center")}>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onPick(suggestion)}
          disabled={disabled}
          className={cn(
            "rounded-full bg-brand-muted font-medium text-brand transition-colors outline-none hover:bg-brand-border/60 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
            small ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-base",
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

const NUMBERED = /^(\d+)\.\s+(.*)$/;

function AnswerCard({ answer }: { answer: Answer }) {
  const numbered = answer.lines.length > 0 && NUMBERED.test(answer.lines[0]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 lg:p-6">
      <h2 className="text-xl font-semibold leading-tight tracking-tight lg:text-2xl">{answer.title}</h2>

      {answer.lines.length > 0 &&
        (numbered ? (
          <ol className="flex flex-col gap-2.5 text-base leading-snug">
            {answer.lines.map((line, index) => {
              const match = NUMBERED.exec(line);
              return (
                <li key={index} className="flex gap-3">
                  <span className="tabular w-6 shrink-0 text-right font-semibold text-brand">{match ? `${match[1]}.` : ""}</span>
                  <span>{match ? match[2] : line}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <ul className="flex list-disc flex-col gap-2.5 pl-5 text-base leading-snug marker:text-brand">
            {answer.lines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        ))}

      {answer.note && <p className="text-sm text-muted-foreground">{answer.note}</p>}

      {answer.link && (
        <div>
          <Button asChild variant="outline" size="lg" className="text-base">
            <Link href={answer.link.href}>
              {answer.link.label}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

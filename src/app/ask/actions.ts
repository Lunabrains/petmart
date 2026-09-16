"use server";

import { askQuestion, type Answer } from "@/lib/ask";
import { loadData } from "@/lib/server-data";

/** Longest question we accept; anything more is cut off, never rejected. */
const MAX_QUESTION_LENGTH = 300;

/**
 * Answers one question from the owner using only company data.
 * No language model, no network: everything comes from askQuestion().
 */
export async function ask(question: string): Promise<Answer> {
  const clean = typeof question === "string" ? question.trim().slice(0, MAX_QUESTION_LENGTH) : "";
  const data = await loadData();
  return askQuestion(clean, data);
}

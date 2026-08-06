import { createServerFn } from "@tanstack/react-start";
import type { HomeBrief } from "@/lib/supabase/database.types";

/**
 * Continuity Memory v1 — the "know before you go" brief, composed by Claude.
 *
 * v0 surfaces the household's structured fields as-is (rule-based). v1 turns
 * those fields into a short, prioritised, natural-language brief using an
 * LLM — behind the SAME booking_home_brief() contract: the client still
 * fetches the RLS-scoped fields, and only the *rendering* changes.
 *
 * The Claude call runs in a TanStack server function, so ANTHROPIC_API_KEY
 * never reaches the browser and the SDK is never bundled client-side (it's
 * imported dynamically inside the handler). If the key isn't set, this
 * returns { prose: null } and the worker card falls back to the v0 fields —
 * honest graceful degradation, not a broken feature.
 *
 * Prototype scope: the server function trusts the fields the client passes
 * (the client already fetched them through the RLS-gated RPC). Production
 * hardening would forward the caller's Supabase token and re-check
 * booking_home_brief server-side, plus rate-limit the endpoint.
 */

export type BriefProse = { prose: string | null; source: "ai" | "template" };

function buildInput(b: HomeBrief): string {
  const lines: string[] = [];
  if (b.access) lines.push(`Getting in: ${b.access}`);
  if (b.dietary) lines.push(`Food and kitchen: ${b.dietary}`);
  if (b.routines) lines.push(`Routines and timings: ${b.routines}`);
  if (b.preferences) lines.push(`How they like things: ${b.preferences}`);
  if (b.notes) lines.push(`Other notes: ${b.notes}`);
  if (b.booking_notes) lines.push(`For this specific visit: ${b.booking_notes}`);
  return `Household: ${b.household_name}\n${lines.join("\n")}`;
}

export const composeHomeBrief = createServerFn({ method: "POST" })
  .validator((input: HomeBrief) => input)
  .handler(async ({ data }): Promise<BriefProse> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { prose: null, source: "template" };

    // Dynamic import keeps the SDK (and this whole path) server-only.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    try {
      const msg = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 1024,
        output_config: { effort: "low" }, // a short rewrite — keep it cheap and fast
        system:
          "You brief a home-services worker who is about to arrive at a household for the first time — " +
          "they may be a last-minute backup who has never been to this home. Turn the household's notes " +
          "into 3 to 5 short, practical bullet points, most important first: put entry/access and any " +
          "safety or health item at the very top. Be concrete, warm, and brief. Output only plain-text " +
          "bullets each starting with '- ' — no preamble, no headings, no closing line. Skip anything " +
          "the household did not provide; never invent details.",
        messages: [{ role: "user", content: buildInput(data) }],
      });

      if (msg.stop_reason === "refusal") return { prose: null, source: "template" };
      const text = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      return text ? { prose: text, source: "ai" } : { prose: null, source: "template" };
    } catch {
      // Any API error → fall back to the v0 fields rather than break the card.
      return { prose: null, source: "template" };
    }
  });

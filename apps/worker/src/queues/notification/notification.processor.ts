import { z as zod } from "@distribution-copilot/shared";
import { prisma } from "@distribution-copilot/database";

import {
  NotificationRepository,
  type OpportunityForNotification,
} from "../../repositories/notification.repository.js";
import { type NotificationJobPayload, type NotificationJobResult } from "./notification.types.js";

const payloadSchema = zod.object({
  productId: zod.string().min(1),
  opportunityIds: zod.array(zod.string().min(1)).min(1),
});

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  stackoverflow: "Stack Overflow",
  lobsters: "Lobsters",
  devto: "Dev.to",
  web: "Web",
};

const SIGNAL_LABELS: Record<string, string> = {
  RECOMMENDATION_REQUEST: "Recommendation Request",
  COMPETITOR_FRUSTRATION: "Competitor Frustration",
  ACTIVE_EVALUATION: "Active Evaluation",
  PAIN_EXPRESSION: "Pain Expression",
  BUDGET_SIGNAL: "Budget Signal",
  CATEGORY_RESEARCH: "Category Research",
};

function formatSource(opp: OpportunityForNotification): string {
  const label = SOURCE_LABELS[opp.discussion.source] ?? opp.discussion.source;
  return opp.discussion.community ? `${label} · r/${opp.discussion.community.name}` : label;
}

function buildSlackText(productName: string, opps: OpportunityForNotification[]): string {
  const header =
    opps.length === 1
      ? `🎯 *1 new high-score opportunity* for ${productName}`
      : `🎯 *${String(opps.length)} new high-score opportunities* for ${productName}`;

  const lines = opps.map((opp) => {
    const score = opp.overallScore ?? 0;
    const signal = opp.signalType ? (SIGNAL_LABELS[opp.signalType] ?? opp.signalType) : "General";
    const risk = opp.overallRisk ?? "unknown";
    const source = formatSource(opp);
    const title =
      opp.discussion.title.length > 80
        ? opp.discussion.title.slice(0, 77) + "…"
        : opp.discussion.title;
    return `• *${title}* — Score: ${String(score)} · ${signal} · Risk: ${risk}\n  ${source} → ${opp.discussion.url}`;
  });

  return [header, "", ...lines].join("\n");
}

function buildTelegramHtml(productName: string, opps: OpportunityForNotification[]): string {
  const count = opps.length;
  const header =
    count === 1
      ? `🎯 <b>1 new high-score opportunity</b> for ${productName}`
      : `🎯 <b>${String(count)} new high-score opportunities</b> for ${productName}`;

  const lines = opps.map((opp) => {
    const score = opp.overallScore ?? 0;
    const signal = opp.signalType ? (SIGNAL_LABELS[opp.signalType] ?? opp.signalType) : "General";
    const risk = opp.overallRisk ?? "unknown";
    const source = formatSource(opp);
    const title =
      opp.discussion.title.length > 80
        ? opp.discussion.title.slice(0, 77) + "…"
        : opp.discussion.title;
    return `• <b>${title}</b> — Score: ${String(score)} · ${signal} · Risk: ${risk}\n  ${source} → <a href="${opp.discussion.url}">View</a>`;
  });

  return [header, "", ...lines].join("\n");
}

async function sendSlack(webhookUrl: string, text: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`Slack webhook returned ${String(response.status)}`);
  }
}

async function sendTelegram(botToken: string, chatId: string, html: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML" }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API returned ${String(response.status)}: ${body}`);
  }
}

/**
 * Sends Slack and/or Telegram alerts for high-score opportunities that just
 * finished scoring. Filters by the product's alertThreshold, skips any
 * opportunity already marked notifiedAt (idempotent on retry).
 */
export async function runNotification(
  raw: unknown,
  log: (msg: string) => void = console.log,
): Promise<NotificationJobResult> {
  const { productId, opportunityIds } = payloadSchema.parse(raw) as NotificationJobPayload;
  log(`[notification] product=${productId} candidates=${String(opportunityIds.length)}`);

  const repo = new NotificationRepository(prisma);

  const product = await repo.findProductAlertConfig(productId);
  if (!product) {
    log(`[notification] product=${productId} not found — skipping`);
    return { sent: false, channels: [], notified: 0 };
  }

  const hasSlack = Boolean(product.slackWebhookUrl);
  const hasTelegram = Boolean(product.telegramBotToken && product.telegramChatId);

  if (!hasSlack && !hasTelegram) {
    log(`[notification] product=${productId} has no alert channels configured — skipping`);
    return { sent: false, channels: [], notified: 0 };
  }

  // Re-fetch opportunities; filter to unnotified ones above the threshold.
  const candidates = await repo.findOpportunitiesForNotification(opportunityIds);
  const eligible = candidates.filter((opp) => (opp.overallScore ?? 0) >= product.alertThreshold);

  if (eligible.length === 0) {
    log(
      `[notification] no opportunities above threshold=${String(product.alertThreshold)} — skipping`,
    );
    return { sent: false, channels: [], notified: 0 };
  }

  log(`[notification] sending alerts for ${String(eligible.length)} opportunities`);

  const channels: string[] = [];

  if (hasSlack && product.slackWebhookUrl) {
    const text = buildSlackText(product.name, eligible);
    await sendSlack(product.slackWebhookUrl, text);
    channels.push("slack");
    log(`[notification] slack sent`);
  }

  if (hasTelegram && product.telegramBotToken && product.telegramChatId) {
    const html = buildTelegramHtml(product.name, eligible);
    await sendTelegram(product.telegramBotToken, product.telegramChatId, html);
    channels.push("telegram");
    log(`[notification] telegram sent`);
  }

  const notifiedAt = new Date();
  await repo.markNotified(
    eligible.map((opp) => opp.id),
    notifiedAt,
  );

  log(`[notification] done — channels=[${channels.join(",")}] notified=${String(eligible.length)}`);
  return { sent: true, channels, notified: eligible.length };
}

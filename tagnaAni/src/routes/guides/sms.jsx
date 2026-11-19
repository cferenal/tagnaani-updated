import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle, smsNumber } from "@/components/PublicPage";

export const Route = createFileRoute("/guides/sms")({ component: SmsGuide });

function SmsGuide() {
  return (
    <PublicArticle title="SMS user guide">
      <p>You can use Tagna-Ani by text without an account or mobile data. You need cellular coverage that supports SMS. Standard carrier charges may apply.</p>
      <p className="font-semibold">Tagna-Ani currently accepts SMS from Philippine mobile numbers only.</p>
      {smsNumber
        ? <p>Send your message to <a className="font-bold underline" href={`sms:${smsNumber}`}>{smsNumber}</a>.</p>
        : <p>The service number will appear here when SMS is available.</p>}
      <ol className="list-decimal space-y-3 pl-6">
        <li>Start your message with <code>ANI</code>.</li>
        <li>Add a supported Mindanao ZIP code or city, your current crop, and the problem you see.</li>
        <li>Send <code>ANI 9200 RICE DROUGHT</code> for an example. For multi-word names, use <code>ANI Iligan City | Sweet potato | Yellow leaves</code>.</li>
      </ol>
      <p>Add <code>BIS</code>, <code>TAG</code>, or <code>ENG</code> at the end to choose your reply language.</p>
      <p>When daily reminders are available, text <code>ANI ALERTS ON</code> after your first advisory request. Text <code>ANI ALERTS OFF</code> to stop.</p>
    </PublicArticle>
  );
}

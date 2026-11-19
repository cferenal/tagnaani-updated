import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle, displaySmsNumber, smsNumber } from "@/components/PublicPage";

import { CROPS, PROBLEMS } from "@/lib/farmData";

export const Route = createFileRoute("/guides/sms")({ component: SmsGuide });

function SmsGuide() {
  return (
    <PublicArticle title="SMS user guide">
      <p>You can use Tagna-Ani by text without an account or mobile data. You need cellular coverage that supports SMS. Standard carrier charges may apply.</p>
      <p className="font-semibold">Tagna-Ani currently accepts SMS from Philippine mobile numbers only.</p>
      {smsNumber
        ? <p>Send your message to <a className="font-bold underline" href={`sms:${smsNumber}`}>{displaySmsNumber}</a>.</p>
        : <p>The service number will appear here when SMS is available.</p>}
      <ol className="list-decimal space-y-3 pl-6">
        <li>Start your message with <code>ANI</code>.</li>
        <li>Add a supported Mindanao ZIP code or city, your current crop, and the problem you see.</li>
        <li>Send <code>ANI 9200 RICE DROUGHT</code> for an example. For multi-word names, use <code>ANI Iligan City | Sweet potato | Pest infestation</code>. You can also text <code>ANI Bagong Silang Iligan City | RICE DROUGHT</code>. Weather is for the matched city.</li>
      </ol>
      <section className="space-y-2">
        <h2 className="font-display text-2xl font-bold">Supported crop presets</h2>
        <ul className="grid list-disc gap-x-6 pl-6 sm:grid-cols-2">{CROPS.map((crop) => <li key={crop}>{crop}</li>)}</ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-2xl font-bold">Farm problems</h2>
        <p>These are the choices in app setup. In an SMS, you can also describe what you see in your own words, such as drought or yellow leaves. Replies give general guidance.</p>
        <ul className="list-disc pl-6">{PROBLEMS.map((problem) => <li key={problem}>{problem}</li>)}</ul>
      </section>
      <p>Text <code>ANI HELP</code> for the format, examples, crop presets, and common farm problems.</p>
      <p>Add <code>BISAYA</code> (or <code>BIS</code>), <code>TAGALOG</code> (or <code>TAG</code>), or <code>ENGLISH</code> (or <code>ENG</code>) at the end to choose your reply language.</p>
      <p>Tagna-Ani keeps recent advisory requests and sender numbers so the team can troubleshoot SMS replies.</p>
      <p>For daily reminders scheduled at 6:00 a.m. Philippine time, text <code>ANI ALERTS ON</code> after your first advisory request. Text <code>ANI ALERTS OFF</code> to stop.</p>
    </PublicArticle>
  );
}

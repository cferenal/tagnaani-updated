import { useSiteLanguage } from "@/lib/siteLanguage";
import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle, displaySmsNumber, smsNumber } from "@/components/PublicPage";

import { CROPS, PROBLEMS } from "@/lib/farmData";

export const Route = createFileRoute("/guides/sms")({ component: SmsGuide });

function SmsGuide() {
  const { t } = useSiteLanguage();
  return (
    <PublicArticle title={t("SMS user guide")}>
      <p>{t("You can use Tagna-Ani by text without an account or mobile data. You need cellular coverage that supports SMS. Standard carrier charges may apply.")}</p>
      <p className="font-semibold">{t("Tagna-Ani currently accepts SMS from Philippine mobile numbers only.")}</p>
      {smsNumber
        ? <p>{t("Send your message to") + " "}<a className="font-bold underline" href={`sms:${smsNumber}`}>{displaySmsNumber}</a>.</p>
        : <p>{t("The service number will appear here when SMS is available.")}</p>}
      <ol className="list-decimal space-y-3 pl-6">
        <li>{t("Start your message with") + " "}<code>ANI</code>.</li>
        <li>{t("Add a Philippine ZIP code, city or municipality, or barangay followed by its city or municipality. Then add your crop and problem.")}</li>
        <li>{t("Send") + " "}<code>ANI 9200 RICE DROUGHT</code>{" " + t("for an example. For multi-word names, use") + " "}<code>ANI Iligan City | Sweet potato | Pest infestation</code>{t(". You can also text") + " "}<code>ANI Bagong Silang Iligan City | RICE DROUGHT</code>{t(". Weather uses the matched place. If a municipality name is shared, include its province after a comma.")}</li>
      </ol>
      <section className="space-y-2">
        <h2 className="font-display text-2xl font-bold">{t("Supported crop presets")}</h2>
        <ul className="grid list-disc gap-x-6 pl-6 sm:grid-cols-2">{CROPS.map((crop) => <li key={crop}>{t(crop)}</li>)}</ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-2xl font-bold">{t("Farm problems")}</h2>
        <p>{t("These are the choices in app setup. In an SMS, you can also describe what you see in your own words, such as drought or yellow leaves. Replies give general guidance.")}</p>
        <ul className="list-disc pl-6">{PROBLEMS.map((problem) => <li key={problem}>{t(problem)}</li>)}</ul>
      </section>
      <p>{t("Text") + " "}<code>ANI HELP</code>{" " + t("for the format, examples, crop presets, and common farm problems.")}</p>
      <p>{t("Add") + " "}<code>BISAYA</code>{" " + t("(or") + " "}<code>BIS</code>), <code>TAGALOG</code>{" " + t("(or") + " "}<code>TAG</code>{t("), or") + " "}<code>ENGLISH</code>{" " + t("(or") + " "}<code>ENG</code>{t(") at the end to choose your reply language.")}</p>
      <p className="text-sm">{t("Forecasts from") + " "}<a className="underline" href="https://open-meteo.com/">Open-Meteo</a>{" " + t("and")}{" "}<a className="underline" href="https://api.met.no/">MET Norway</a>{t(". Historical climate from")}{" "}<a className="underline" href="https://power.larc.nasa.gov/">NASA POWER</a>.
      </p>
      <p>{t("Tagna-Ani keeps recent advisory requests and sender numbers so the team can troubleshoot SMS replies.")}</p>
      <p>{t("For daily reminders scheduled at 6:00 a.m. Philippine time, text") + " "}<code>ANI ALERTS ON</code>{" " + t("after your first advisory request. Text") + " "}<code>ANI ALERTS OFF</code>{" " + t("to stop.")}</p>
    </PublicArticle>
  );
}

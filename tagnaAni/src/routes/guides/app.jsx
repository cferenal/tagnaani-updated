import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicArticle } from "@/components/PublicPage";

export const Route = createFileRoute("/guides/app")({ component: AppGuide });

function AppGuide() {
  return (
    <PublicArticle title="App user guide">
      <ol className="list-decimal space-y-4 pl-6">
        <li><Link to="/register" className="underline">Create an account</Link> or <Link to="/login" className="underline">log in</Link>.</li>
        <li>Search for your farm by town, province, or ZIP code. If the results miss your farm, enter latitude and longitude from a map pin. Then choose your crops and current problems.</li>
        <li>Open Home to check the weather, field conditions, and crop rotation planner.</li>
        <li>Use Records and Stats to track farm activity, costs, and income. Update your farm information under Profile.</li>
        <li>To set up SMS recovery, verify your Philippine mobile number in the SMS settings on Home. You can opt in to daily reminders there when available.</li>
      </ol>
      <p>The app can show some information previously saved on this device. Sign-in, live updates, and SMS settings require a connection.</p>
    </PublicArticle>
  );
}

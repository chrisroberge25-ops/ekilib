import { ChatPanel } from "@/components/chat-panel";
import { requireUser } from "@/lib/auth";
import { dictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";
import { loadDashboard, loadMessages } from "@/lib/queries";

export default async function ChatPage() {
  const user = await requireUser();
  const locale = isLocale(user.locale) ? user.locale : "ht";
  const dict = dictionary(locale);
  const [data, messages] = await Promise.all([
    loadDashboard(user.id, user.timezone, user.voiceId),
    loadMessages(user.id),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <ChatPanel dict={dict} locale={locale} date={data.today} initial={messages} />
    </div>
  );
}

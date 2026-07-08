import ArchiveShell from "@/components/ArchiveShell";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Settings — Safarnama" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <ArchiveShell user={user} active="archive">
      <section>
        <div className="flex items-center gap-5">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Your settings</h1>
          <span aria-hidden className="h-px flex-1 bg-ink/15" />
        </div>
        <p className="mt-4 font-hand text-xl text-ink-soft">
          keep the lantern lit, {user.name.split(" ")[0]}
        </p>
      </section>

      <section className="mt-14">
        <div className="flex items-center gap-5">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Change password</h2>
          <span aria-hidden className="h-px flex-1 bg-ink/15" />
        </div>
        <ChangePasswordForm />
      </section>
    </ArchiveShell>
  );
}

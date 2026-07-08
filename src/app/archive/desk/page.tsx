import ArchiveShell from "@/components/ArchiveShell";
import AdminDesk from "@/components/AdminDesk";
import { requireAdmin } from "@/lib/auth";
import {
  getPendingApprovals,
  getUsers,
  getUploadCounts,
  getTrips,
  getAllMedia,
} from "@/lib/queries";

export const metadata = { title: "Editor's desk — Safarnama" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [requests, users, uploadCounts, trips, media] = await Promise.all([
    getPendingApprovals(),
    getUsers(),
    getUploadCounts(),
    getTrips(),
    getAllMedia(),
  ]);

  const tripCounts: Record<string, { total: number; pub: number }> = {};
  for (const m of media) {
    const c = (tripCounts[m.tripSlug] ??= { total: 0, pub: 0 });
    c.total += 1;
    if (m.isPublic) c.pub += 1;
  }

  return (
    <ArchiveShell user={admin} active="admin">
      <AdminDesk
        requests={requests}
        users={users}
        uploadCounts={uploadCounts}
        trips={trips}
        tripCounts={tripCounts}
        mediaTotal={media.length}
        publicTotal={media.filter((m) => m.isPublic).length}
      />
    </ArchiveShell>
  );
}

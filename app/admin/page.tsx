import { adminConfigured, currentSession } from "@/lib/server/admin-auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { AdminApp } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <div className="box box-error" role="alert">
        <h1 className="text-xl font-semibold">Admin is not configured</h1>
        <p>Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH_B64 and SESSION_SECRET (32+ characters) in the server environment. See docs/ADMIN_GUIDE.md.</p>
      </div>
    );
  }
  const session = await currentSession();
  return session ? <AdminApp /> : <LoginForm />;
}

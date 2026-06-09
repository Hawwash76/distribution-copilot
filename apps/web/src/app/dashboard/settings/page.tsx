"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAccount } from "@/features/account/hooks/use-account";
import { useUpdateAccount } from "@/features/account/hooks/use-update-account";
import { useChangePassword } from "@/features/account/hooks/use-change-password";
import { useDeleteAccount } from "@/features/account/hooks/use-delete-account";
import { signOut } from "@/lib/auth-client";

export default function SettingsPage() {
  const router = useRouter();
  const { data: account, isLoading } = useAccount();
  const { mutate: updateAccount, isPending: isUpdating } = useUpdateAccount();
  const { mutate: changePassword, isPending: isChangingPw } = useChangePassword();
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (account) {
      setName(account.name);
      setEmail(account.email);
    }
  }, [account]);

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaved(false);
    setProfileError("");
    updateAccount(
      { name: name.trim() || undefined, email: email.trim() || undefined },
      {
        onSuccess: () => setProfileSaved(true),
        onError: (err) => setProfileError(err.message),
      },
    );
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwSaved(false);
    setPwError("");
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match.");
      return;
    }
    changePassword(
      { currentPassword: currentPw, newPassword: newPw },
      {
        onSuccess: () => {
          setPwSaved(true);
          setCurrentPw("");
          setNewPw("");
          setConfirmPw("");
        },
        onError: (err) => setPwError(err.message),
      },
    );
  }

  async function handleDeleteAccount() {
    if (!confirm("Permanently delete your account? This cannot be undone.")) return;
    deleteAccount(undefined, {
      onSuccess: async () => {
        await signOut();
        router.push("/login");
      },
    });
  }

  const inputClass =
    "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const labelClass = "text-sm font-medium";

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="max-w-lg space-y-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account.</p>
      </div>

      {/* Profile */}
      <section>
        <h3 className="mb-4 text-base font-medium">Profile</h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setProfileSaved(false);
              }}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setProfileSaved(false);
              }}
              className={inputClass}
            />
          </div>
          {profileSaved && <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>}
          {profileError && <p className="text-destructive text-sm">{profileError}</p>}
          <button
            type="submit"
            disabled={isUpdating}
            className="border-border hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isUpdating ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      <div className="border-border border-t" />

      {/* Change password */}
      <section>
        <h3 className="mb-4 text-base font-medium">Change password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="currentPw" className={labelClass}>
              Current password
            </label>
            <input
              id="currentPw"
              type="password"
              required
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => {
                setCurrentPw(e.target.value);
                setPwSaved(false);
              }}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="newPw" className={labelClass}>
              New password
            </label>
            <input
              id="newPw"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => {
                setNewPw(e.target.value);
                setPwSaved(false);
              }}
              className={inputClass}
              placeholder="Min. 8 characters"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirmPw" className={labelClass}>
              Confirm new password
            </label>
            <input
              id="confirmPw"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => {
                setConfirmPw(e.target.value);
                setPwSaved(false);
              }}
              className={inputClass}
            />
          </div>
          {pwSaved && (
            <p className="text-sm text-green-600 dark:text-green-400">Password updated.</p>
          )}
          {pwError && <p className="text-destructive text-sm">{pwError}</p>}
          <button
            type="submit"
            disabled={isChangingPw}
            className="border-border hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isChangingPw ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <div className="border-border border-t" />

      {/* Danger zone */}
      <section>
        <h3 className="mb-1 text-base font-medium">Delete account</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Your account will be deactivated. This action cannot be undone.
        </p>
        <button
          onClick={() => void handleDeleteAccount()}
          disabled={isDeleting}
          className="text-destructive hover:bg-destructive/10 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete account"}
        </button>
      </section>
    </div>
  );
}

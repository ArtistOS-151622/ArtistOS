"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Phone, Save, User, Building2, MapPin, Mail, LogOut, ImageIcon, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"

import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { FloatingInput } from "@/components/common/shared/floating-input"
import { FloatingTextarea } from "@/components/common/shared/floating-input"
import { PortfolioUploader } from "@/components/portfolio/portfolio-uploader"
import { StorageMeter } from "@/components/storage/storage-meter"
import { StoragePlansModal } from "@/components/storage/storage-plans-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { QuotaInfo, StoragePlanRow } from "@/lib/portfolio/types"

type ProfileData = {
  id: number
  phone: string
  artist_name: string
  studio_name: string
  email: string | null
  address: string
  avatar_url?: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [plans, setPlans] = useState<StoragePlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [plansOpen, setPlansOpen] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const [profileRes, storageRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/portfolio/storage-info"),
      ])
      const profileData = await profileRes.json()
      const storageData = await storageRes.json()

      if (!profileRes.ok) throw new Error(profileData.error || "Failed to load profile")

      setProfile({
        ...profileData.profile,
        email: profileData.profile.email || "",
        avatar_url: profileData.profile.avatar_url,
      })
      setQuota(profileData.storage ?? storageData.data?.quota ?? null)
      if (storageData.status) setPlans(storageData.data.plans ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_name: profile.artist_name,
          studio_name: profile.studio_name,
          email: profile.email,
          address: profile.address,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")

      setSuccess("Profile updated successfully!")
      router.refresh()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    localStorage.removeItem("artistos-auth")
    sessionStorage.clear()
    router.replace("/login")
    router.refresh()
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Profile" />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Profile" />
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        <Card id="storage" className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-xl">Storage</CardTitle>
              <CardDescription>
                10 MB free included. Upgrade for more portfolio space with monthly autopay.
              </CardDescription>
            </div>
            <Button variant="outline" className="rounded-2xl shrink-0" onClick={() => setPlansOpen(true)}>
              Upgrade
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <StorageMeter quota={quota} />
            <Link
              href="/portfolio"
              className="inline-flex items-center text-sm font-medium text-[#7c3aed] hover:underline"
            >
              <ImageIcon className="mr-1.5 size-4" />
              Manage portfolio folders
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-xl">WhatsApp Integration</CardTitle>
              <CardDescription>
                Connect your WhatsApp account to send broadcast messages and updates to customers.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/profile/whatsapp"
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 rounded-2xl w-full sm:w-auto"
            >
              <Smartphone className="mr-2 size-4" />
              Manage Devices
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Personal Information</CardTitle>
            <CardDescription>
              Manage your artist profile and studio details. This information is used across ArtistOS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-600 font-medium">
                {success}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative group">
                  <Avatar className="size-24 border-4 border-white shadow-lg">
                    {profile?.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt={profile.artist_name} />
                    )}
                    <AvatarFallback className="bg-purple-100 text-2xl font-bold text-[#7c3aed]">
                      {profile?.artist_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase() || "AS"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PortfolioUploader
                      setAsAvatar
                      onUploaded={loadProfile}
                      onQuotaExceeded={() => setPlansOpen(true)}
                      label="Photo"
                      className="scale-90"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{profile?.artist_name || "Artist"}</h3>
                  <p className="text-sm text-muted-foreground">{profile?.studio_name}</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FloatingInput
                  id="artist_name"
                  label="Artist Name"
                  icon={<User className="size-4" />}
                  value={profile?.artist_name || ""}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, artist_name: e.target.value } : null)}
                  required
                />

                <FloatingInput
                  id="studio_name"
                  label="Studio Name"
                  icon={<Building2 className="size-4" />}
                  value={profile?.studio_name || ""}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, studio_name: e.target.value } : null)}
                  required
                />

                <FloatingInput
                  id="phone"
                  label="Mobile Number (Read-only)"
                  icon={<Phone className="size-4" />}
                  value={profile?.phone || ""}
                  disabled
                />

                <FloatingInput
                  id="email"
                  label="Email Address"
                  icon={<Mail className="size-4" />}
                  type="email"
                  value={profile?.email || ""}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                />

                <FloatingTextarea
                  id="address"
                  label="Studio / Default Booking Address"
                  icon={<MapPin className="size-4" />}
                  value={profile?.address || ""}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, address: e.target.value } : null)}
                  containerClassName="md:col-span-2"
                  className="min-h-24"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogoutOpen(true)}
                  className="h-11 rounded-2xl border-rose-200 bg-rose-50 text-rose-600 px-6 hover:bg-rose-100 transition-all md:hidden"
                >
                  <LogOut className="mr-2 size-4" />
                  Logout
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !profile?.artist_name || !profile?.studio_name || !profile?.address}
                  className="h-11 rounded-2xl bg-[#7c3aed] text-white px-8 shadow-md shadow-purple-950/10 hover:bg-[#6d28d9] transition-all ml-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <StoragePlansModal
        open={plansOpen}
        onClose={() => setPlansOpen(false)}
        plans={plans}
        onSuccess={loadProfile}
      />

      <ConfirmDialog
        open={logoutOpen}
        title="Logout from ArtistOS?"
        description="You will return to the login page. Your dashboard data will stay safe."
        confirmText="Logout"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  )
}

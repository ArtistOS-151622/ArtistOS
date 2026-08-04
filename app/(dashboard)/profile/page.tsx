"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Phone, Save, User, Building2, MapPin, Mail, LogOut, ImageIcon, Smartphone, Download, Camera } from "lucide-react"
import { useRouter } from "next/navigation"

import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { PushNotificationToggle } from "@/components/common/pwa/push-notification-toggle"
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
  studio_logo_url?: string | null
}

function isIos() {
  if (typeof window === "undefined") return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone() {
  if (typeof window === "undefined") return false
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  )
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
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const body = new FormData()
      body.set("file", file)
      body.set("set_as_studio_logo", "true")
      const res = await fetch("/api/portfolio/files/upload", { method: "POST", body })
      const json = await res.json()
      if (!json.status) {
        if (res.status === 402) setPlansOpen(true)
      } else {
        await loadProfile()
      }
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ""
    }
  }

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
        studio_logo_url: profileData.profile.studio_logo_url,
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

  useEffect(() => {
    setIsInstalled(isStandalone() || localStorage.getItem("artistos-pwa-installed") === "true")

    if ((window as any).deferredPwaPrompt) {
      setCanInstall(true)
    }

    const handler = () => {
      setCanInstall(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleInstallApp() {
    const promptEvent = (window as any).deferredPwaPrompt
    if (!promptEvent) {
      if (isIos()) {
        alert("To install on iOS: tap the Share button, then 'Add to Home Screen'.")
      } else {
        alert("Browser install is not ready yet. Try refreshing the page.")
      }
      return
    }

    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === "accepted") {
        localStorage.setItem("artistos-pwa-installed", "true")
        setIsInstalled(true)
        setCanInstall(false)
      }
    } catch (e) {
      console.error("Failed to prompt install", e)
    }
  }

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
      <div className="space-y-4 pb-12">

        {/* Profile Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5b21b6] via-[#7c3aed] to-[#a855f7] p-5 sm:p-7">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 size-32 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute top-2 right-1/3 size-20 rounded-full bg-white/5" />

          {/* Logout — always top-right */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLogoutOpen(true)}
            className="absolute top-4 right-4 h-8 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/20 px-3 text-xs sm:text-sm sm:h-9 sm:px-4"
          >
            <LogOut className="mr-1.5 size-3.5" />
            Logout
          </Button>

          {/* Main content */}
          <div className="relative flex items-center gap-4 pr-24 sm:pr-28">
            {/* Avatar with edit badge */}
            <div className="relative shrink-0">
              {/* Hidden file input */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Avatar className="size-16 sm:size-20 border-[3px] border-white/40 shadow-xl rounded-xl">
                {profile?.studio_logo_url ? (
                  <AvatarImage src={profile.studio_logo_url} alt={profile?.studio_name} className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/15 text-white/80">
                    <Building2 className="size-7 sm:size-8" />
                  </div>
                )}
              </Avatar>
              {/* Edit badge */}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-white shadow-md border-2 border-white/80 text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-60"
                title="Change logo"
              >
                {logoUploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
            </div>

            {/* Name & studio */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight truncate">
                {profile?.artist_name || "Artist"}
              </h1>
              <p className="mt-0.5 text-white/75 font-medium text-sm truncate">{profile?.studio_name}</p>
              <p className="mt-0.5 text-white/45 text-xs sm:text-sm">{profile?.phone}</p>
            </div>
          </div>
        </div>


        {/* Personal Information */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {/* Card top stripe */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50">
              <User className="size-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Personal Information</p>
              <p className="text-xs text-slate-500">Manage your artist profile and studio details.</p>
            </div>
          </div>

          {/* Card body */}
          <div className="p-5">
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 text-sm text-emerald-600 font-medium">
                {success}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  containerClassName="sm:col-span-2"
                  className="min-h-20"
                  required
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={saving || !profile?.artist_name || !profile?.studio_name || !profile?.address}
                  className="h-10 rounded-xl bg-[#7c3aed] text-white px-7 shadow-md shadow-purple-950/15 hover:bg-[#6d28d9] transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving…
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
          </div>
        </div>

        {/* Second row: Storage + App Install */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Storage */}
          <div id="storage" className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50">
                  <ImageIcon className="size-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Storage</p>
                  <p className="text-xs text-slate-500">10 MB free. Upgrade for more space.</p>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl shrink-0 h-8 text-xs px-3" onClick={() => setPlansOpen(true)}>
                Upgrade
              </Button>
            </div>
            <div className="p-5 space-y-3">
              <StorageMeter quota={quota} />
              <Link
                href="/portfolio"
                className="inline-flex items-center text-sm font-medium text-[#7c3aed] hover:underline"
              >
                <ImageIcon className="mr-1.5 size-4" />
                Manage portfolio folders
              </Link>
            </div>
          </div>

          {/* App Install */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50">
                <Smartphone className="size-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">App Installation</p>
                <p className="text-xs text-slate-500">Install for a faster native experience.</p>
              </div>
            </div>
            <div className="p-5">
              {isInstalled ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 text-emerald-700">
                  <Smartphone className="size-5 shrink-0" />
                  <span className="font-medium text-sm">App is already installed on this device.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                      <Smartphone className="size-5 text-violet-600" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">ArtistOS Desktop / Mobile App</p>
                      <p className="text-slate-500 text-xs mt-0.5">Quick access from your home screen.</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleInstallApp}
                    className="w-full rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                  >
                    <Download className="mr-2 size-4" />
                    Install App
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50">
              <Smartphone className="size-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">Turn on booking alerts for each device you use.</p>
            </div>
          </div>
          <div className="p-5">
            <PushNotificationToggle />
          </div>
        </div>

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


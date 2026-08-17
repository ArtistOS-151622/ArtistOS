"use client"

import Image from "next/image"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { PwaInstallGuideModal } from "@/components/common/pwa/pwa-install-guide-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "artistos-pwa-install-closed"
const INSTALLED_KEY = "artistos-pwa-installed"

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

export function PwaInstallPrompt() {
  const pathname = usePathname()
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIosDevice, setIsIosDevice] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [hint, setHint] = useState("Add to your device for a fast native app experience.")

  useEffect(() => {
    const ios = isIos()
    setIsIosDevice(ios)

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {})
    }

    localStorage.removeItem("artistos-pwa-install-dismissed")

    let fallbackTimer: number | undefined

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      window.clearTimeout(fallbackTimer)

      // Store globally so other components can access it
      ;(window as any).deferredPwaPrompt = event

      if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === "true") return
      if (localStorage.getItem(DISMISSED_KEY) === "true") return

      setPromptEvent(event as InstallPromptEvent)
      setHint("Add ArtistOS to your home screen for instant access.")
      setVisible(true)
    }

    const onAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "true")
      setVisible(false)
      setPromptEvent(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    if (!isStandalone() && localStorage.getItem(INSTALLED_KEY) !== "true" && localStorage.getItem(DISMISSED_KEY) !== "true") {
      fallbackTimer = window.setTimeout(() => {
        if (ios) {
          setHint("Tap 'How to Install' to add ArtistOS to your iPhone / iPad.")
        } else {
          setHint("Install ArtistOS for a fast app experience on your device.")
        }
        setVisible(true)
      }, 900)
    }

    return () => {
      window.clearTimeout(fallbackTimer)
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  async function handleInstallClick() {
    if (isIosDevice) {
      setGuideOpen(true)
      return
    }

    if (!promptEvent) {
      const globalPrompt = (window as any).deferredPwaPrompt
      if (globalPrompt) {
        try {
          await globalPrompt.prompt()
          const choice = await globalPrompt.userChoice
          if (choice.outcome === "accepted") {
            localStorage.setItem(INSTALLED_KEY, "true")
            setVisible(false)
          }
          return
        } catch {}
      }
      setGuideOpen(true)
      return
    }

    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === "accepted") {
        localStorage.setItem(INSTALLED_KEY, "true")
        setVisible(false)
        setPromptEvent(null)
      }
    } catch {
      setGuideOpen(true)
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true")
    setVisible(false)
  }

  // Never show the install prompt on shared portfolio pages
  if (pathname?.startsWith("/portfolio/shared/")) return null

  // Already installed — running as a standalone PWA or marked installed
  if (isStandalone() || (typeof window !== "undefined" && localStorage.getItem(INSTALLED_KEY) === "true")) return null

  if (!visible) return null

  return (
    <>
      <Card className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1rem)] max-w-[420px] -translate-x-1/2 overflow-hidden border-0 bg-gradient-to-r from-[#8b00ff] via-[#a100ff] to-[#7c3aed] text-white shadow-2xl shadow-primary/35 sm:bottom-5">
        <CardContent className="flex items-center gap-3 p-4">
          <Image
            src="/icons/icon-192x192.png"
            alt="ArtistOS"
            width={52}
            height={52}
            className="size-14 rounded-2xl border-4 border-white/90 bg-white shadow-sm shrink-0"
          />
          <div className="min-w-0 flex-1 pr-1">
            <p className="font-semibold leading-5 text-sm sm:text-base">Install ArtistOS</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-white/90">{hint}</p>
          </div>
          <Button
            variant="secondary"
            className="h-9 rounded-lg bg-white px-3.5 text-xs font-semibold text-primary hover:bg-white/90 shrink-0"
            onClick={handleInstallClick}
          >
            {isIosDevice ? "How to Install" : promptEvent ? "Install" : "How to Install"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-xl bg-white/15 text-white hover:bg-white/25 hover:text-white"
            onClick={dismiss}
            aria-label="Close install prompt"
          >
            <X className="size-4" />
          </Button>
        </CardContent>
      </Card>

      <PwaInstallGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        isIosDevice={isIosDevice}
      />
    </>
  )
}

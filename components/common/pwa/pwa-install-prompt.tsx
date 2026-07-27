"use client"

import Image from "next/image"
import { X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "artistos-pwa-install-closed"
const INSTALLED_KEY = "artistos-pwa-installed"

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  )
}

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [hint, setHint] = useState("Add to your home screen for a native app experience.")

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
    }

    localStorage.removeItem("artistos-pwa-install-dismissed")
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === "true") return
    if (sessionStorage.getItem(DISMISSED_KEY) === "true") return

    const fallbackTimer = window.setTimeout(() => {
      setHint(
        isIos()
          ? "Use Share, then Add to Home Screen."
          : "Open in Chrome/Edge on localhost or HTTPS, then refresh once."
      )
      setVisible(true)
    }, 900)

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      window.clearTimeout(fallbackTimer)
      setPromptEvent(event as InstallPromptEvent)
      setHint("Add it to your device for faster access.")
      setVisible(true)
    }

    const onAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "true")
      setVisible(false)
      setPromptEvent(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    return () => {
      window.clearTimeout(fallbackTimer)
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  async function installApp() {
    if (!promptEvent) {
      setHint(
        isIos()
          ? "iOS requires Share, then Add to Home Screen."
          : window.isSecureContext
            ? "Browser install is not ready yet. Refresh once after the service worker loads."
            : "PWA install needs localhost or HTTPS."
      )
      return
    }

    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === "accepted") localStorage.setItem(INSTALLED_KEY, "true")
    setVisible(false)
    setPromptEvent(null)
  }

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "true")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Card className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1rem)] max-w-[420px] -translate-x-1/2 overflow-hidden border-0 bg-gradient-to-r from-[#8b00ff] via-[#a100ff] to-[#7c3aed] text-white shadow-2xl shadow-primary/35 sm:bottom-5">
      <CardContent className="flex items-center gap-3 p-4">
        <Image
          src="/icons/icon-192x192.png"
          alt="ArtistOS"
          width={52}
          height={52}
          className="size-14 rounded-2xl border-4 border-white/90 bg-white shadow-sm"
        />
        <div className="min-w-0 flex-1 pr-1">
          <p className="font-semibold leading-5">Install ArtistOS</p>
          <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-white/85">{hint}</p>
        </div>
        <Button
          variant="secondary"
          className="h-10 rounded-lg bg-white px-5 font-semibold text-primary hover:bg-white/90"
          onClick={installApp}
        >
          Install
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-xl bg-white/15 text-white hover:bg-white/25 hover:text-white"
          onClick={dismiss}
          aria-label="Close install prompt"
        >
          <X className="size-5" />
        </Button>
      </CardContent>
    </Card>
  )
}

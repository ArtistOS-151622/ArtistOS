"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import type { PortfolioFileWithUrl } from "@/lib/portfolio/types"

type ShareData = {
  folder: { name: string; description: string | null }
  owner: { artist_name: string; studio_name: string; avatar_url: string | null } | null
  unavailable: boolean
  subscription_status: string
  files: PortfolioFileWithUrl[]
}

export default function PublicPortfolioSharePage() {
  const params = useParams()
  const uuid = params.uuid as string
  const [data, setData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<PortfolioFileWithUrl | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/public/portfolio/shared/${uuid}`)
      const json = await res.json()
      if (json.status) setData(json.data)
      setLoading(false)
    }
    void load()
  }, [uuid])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#f7f8fc]">
        <Loader2 className="size-8 animate-spin text-[#7c3aed]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-[#f7f8fc] px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Link not found</h1>
        <p className="mt-2 text-slate-500">This share link may have expired or been revoked.</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-[#f7f8fc] via-white to-[#f0f4ff]">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-6">
          {data.owner?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.owner.avatar_url}
              alt=""
              className="size-14 rounded-full border-2 border-white shadow-md object-cover"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-[#7c3aed]">
              {data.owner?.artist_name?.[0] ?? "A"}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{data.folder.name}</h1>
            <p className="text-sm text-slate-500">
              {data.owner?.artist_name} · {data.owner?.studio_name}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {data.unavailable ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
            <h2 className="text-lg font-semibold text-amber-900">Gallery temporarily unavailable</h2>
            <p className="mt-2 text-sm text-amber-800">
              The artist&apos;s storage plan needs renewal. Please ask them to renew their ArtistOS subscription.
            </p>
          </div>
        ) : data.files.length === 0 ? (
          <p className="text-center text-slate-500 py-20">No files in this folder yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setPreview(file)}
                className="aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                {file.mime_type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.public_url} alt={file.original_name} className="h-full w-full object-cover" />
                ) : file.mime_type.startsWith("video/") ? (
                  <video src={file.public_url} className="h-full w-full object-cover" muted />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-xs text-slate-600">
                    {file.original_name}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreview(null)}
        >
          {preview.mime_type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.public_url}
              alt={preview.original_name}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : preview.mime_type.startsWith("video/") ? (
            <video
              src={preview.public_url}
              controls
              className="max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

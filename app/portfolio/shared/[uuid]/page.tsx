"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, PlayCircle } from "lucide-react"

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
        ) : data.files.filter(f => f.mime_type.startsWith("image/") || f.mime_type.startsWith("video/")).length === 0 ? (
          <p className="text-center text-slate-500 py-20">No media in this folder yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.files
              .filter(f => f.mime_type.startsWith("image/") || f.mime_type.startsWith("video/"))
              .map((file) => (
              <div key={file.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                {/* Thumbnail — click to preview */}
                <button
                  type="button"
                  onClick={() => setPreview(file)}
                  className="absolute inset-0 h-full w-full"
                >
                  {file.mime_type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.public_url} alt={file.original_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 group-hover:from-violet-600 group-hover:via-fuchsia-600 group-hover:to-pink-600 transition-colors">
                      <PlayCircle className="size-12 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
                {/* Download icon — always visible on mobile, hover-only on desktop */}
                <a
                  href={file.public_url}
                  download={file.original_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-xl bg-black/60 text-white opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/80 backdrop-blur-sm"
                  title="Download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/92 p-4"
          onClick={() => setPreview(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-xl bg-white/15 text-white transition-colors hover:bg-white/25 backdrop-blur-sm"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Media */}
          {preview.mime_type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.public_url}
              alt={preview.original_name}
              className="max-h-[80svh] max-w-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : preview.mime_type.startsWith("video/") ? (
            <video
              src={preview.public_url}
              controls
              className="max-h-[80svh] max-w-full rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

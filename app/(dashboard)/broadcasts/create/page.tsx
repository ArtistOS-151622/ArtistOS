"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Play, CheckCircle2, ChevronRight, ChevronLeft, RefreshCw,
  ImagePlus, X, Save, Send, ChevronDown, Users, MessageSquare, Zap,
} from "lucide-react"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

type Customer = { id: number; name: string; phone: string | null }
type Template = { id: number; title: string; content: string; language: string; image_url: string | null; user_id: number | null }

const STEPS = [
  { num: 1, label: "Message", icon: MessageSquare },
  { num: 2, label: "Recipients", icon: Users },
  { num: 3, label: "Send", icon: Send },
]

export default function CreateBroadcastPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState("")
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [newTemplateTitle, setNewTemplateTitle] = useState("")
  const [newTemplateLang, setNewTemplateLang] = useState("English")
  const [filterLang, setFilterLang] = useState("All")
  const [preview, setPreview] = useState("")
  const [sentCustomerIds, setSentCustomerIds] = useState<number[]>([])

  useEffect(() => {
    fetch("/api/customers?limit=1000").then(r => r.json()).then(d => {
      if (d.customers) {
        setCustomers(
          d.customers
            .map((c: any) => ({ id: c.id, name: c.customer_name, phone: c.phone }))
            .filter((c: Customer) => c.phone)
            .map((c: Customer) => ({ ...c, phone: c.phone?.replace(/\D/g, "") || "" }))
        )
      }
    }).catch(() => {})
    fetch("/api/whatsapp/templates").then(r => r.json()).then(d => {
      if (d.templates) {
        setTemplates(d.templates)
        const tmplId = searchParams?.get("template")
        if (tmplId) {
          const tmpl = d.templates.find((t: Template) => t.id === Number(tmplId))
          if (tmpl) setMessage(tmpl.content)
        }
      }
    }).catch(() => {})
  }, [searchParams])

  const generatePreview = useCallback((name = "John Doe") => {
    let text = message.replace(/\\n/g, "\n").replace(/\{\{name\}\}/g, name)
    return text.replace(/\{([^{}]*)\}/g, (_, c) => {
      const parts = c.split("|")
      return parts[Math.floor(Math.random() * parts.length)]
    })
  }, [message])

  useEffect(() => { setPreview(generatePreview()) }, [message, generatePreview])

  const toggleCustomer = (id: number) =>
    setSelectedCustomers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Only image files allowed")
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB")
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null); setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleNextToStep3 = async () => {
    if (selectedCustomers.length === 0) return toast.error("Select at least one customer")
    setLoading(true)
    try {
      let finalImageUrl = null
      if (imageFile) {
        setUploadingImage(true)
        const fd = new FormData(); fd.append("file", imageFile)
        const r = await fetch("/api/whatsapp/templates/upload", { method: "POST", body: fd })
        const d = await r.json(); setUploadingImage(false)
        if (!r.ok) { toast.error(d.error || "Image upload failed"); setLoading(false); return }
        finalImageUrl = d.url
      }
      if (saveTemplate && newTemplateTitle) {
        await fetch("/api/whatsapp/templates", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTemplateTitle, content: message, language: newTemplateLang, image_url: finalImageUrl }),
        })
        toast.success("Template saved!")
      }
      if (finalImageUrl) setMessage(prev => prev + `\\n\\nImage: ${finalImageUrl}`)
      setStep(3)
    } catch { toast.error("An unexpected error occurred") }
    finally { setLoading(false) }
  }

  const sendManualMessage = (customer: Customer) => {
    if (!customer.phone) return
    const msg = encodeURIComponent(generatePreview(customer.name))
    window.open(`https://wa.me/${customer.phone}?text=${msg}`, "_blank")
    setSentCustomerIds(prev => [...prev, customer.id])
  }

  const filteredTemplates = templates.filter(t => filterLang === "All" || t.language === filterLang)
  const selectedList = customers.filter(c => selectedCustomers.includes(c.id))
  const sentCount = sentCustomerIds.length
  const totalSelected = selectedCustomers.length

  return (
    <>
      <PageHeader title="New Broadcast" />
      <div className="mx-auto w-full max-w-5xl px-4 md:px-8 space-y-5 pb-12">

        {/* Premium Stepper */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            {STEPS.map(({ num, label, icon: Icon }, idx) => {
              const active = step === num
              const done = step > num
              return (
                <div key={num} className={`flex-1 flex items-center gap-3 px-5 py-4 relative transition-colors ${active ? "bg-violet-50" : done ? "bg-slate-50" : "bg-white"} ${idx < 2 ? "sm:border-r border-b sm:border-b-0 border-slate-100" : ""}`}>
                  <div className={`shrink-0 flex size-9 items-center justify-center rounded-xl font-bold text-sm transition-all ${done ? "bg-emerald-100 text-emerald-600" : active ? "bg-[#7c3aed] text-white shadow-md shadow-purple-900/20" : "bg-slate-100 text-slate-400"}`}>
                    {done ? <CheckCircle2 className="size-5" /> : <Icon className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${active ? "text-violet-600" : done ? "text-emerald-600" : "text-slate-400"}`}>Step {num}</p>
                    <p className={`text-sm font-semibold truncate ${active ? "text-slate-900" : done ? "text-slate-600" : "text-slate-400"}`}>{label}</p>
                  </div>
                  {active && (
                    <>
                      <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed] rounded-full" />
                      <div className="sm:hidden absolute left-0 top-0 bottom-0 w-1 bg-[#7c3aed] rounded-full" />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">

          {/* STEP 1 — Compose */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-100 px-4 sm:px-6 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                  <MessageSquare className="size-4 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Compose Message</p>
                  <p className="text-xs text-slate-500">Use <code className="bg-slate-100 px-1 rounded text-violet-600">{"{{name}}"}</code> for personalization, <code className="bg-slate-100 px-1 rounded text-violet-600">{"{Hi|Hello}"}</code> for spintax.</p>
                </div>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: compose */}
                <div className="space-y-5">
                  {/* Template picker */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Templates</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger className={buttonVariants({ variant: "outline", className: "h-7 rounded-lg px-2.5 gap-1.5 font-normal text-xs border-slate-200" })}>
                          {filterLang === "All" ? "All" : filterLang} <ChevronDown className="size-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-xl">
                          <DropdownMenuRadioGroup value={filterLang} onValueChange={setFilterLang}>
                            {["All", "English", "Hindi", "Gujarati"].map(l => (
                              <DropdownMenuRadioItem key={l} value={l}>{l === "All" ? "All Languages" : l}</DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {filteredTemplates.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No templates found.</p>
                      ) : filteredTemplates.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setMessage(tpl.content)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea */}
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Your Message</Label>
                    <Textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="min-h-[160px] rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#7c3aed] resize-none text-sm transition-colors"
                    />
                    <p className="mt-1.5 text-[10px] text-slate-400">Variables: <span className="font-mono">{"{{name}}"}</span> · Spintax: <span className="font-mono">{"{Option 1|Option 2}"}</span></p>
                  </div>

                  {/* Image */}
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Attach Image <span className="font-normal normal-case text-slate-400">(optional, max 5MB)</span></Label>
                    {imagePreview ? (
                      <div className="relative w-fit">
                        <img src={imagePreview} alt="Preview" className="h-28 rounded-xl object-cover border border-slate-200 shadow-sm" />
                        <button type="button" onClick={clearImage} className="absolute -top-2 -right-2 size-6 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow hover:bg-rose-50 hover:border-rose-300 transition-colors">
                          <X className="size-3.5 text-slate-500" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 w-full border-2 border-dashed border-slate-200 rounded-xl px-4 py-3.5 text-slate-400 hover:border-[#7c3aed] hover:text-[#7c3aed] hover:bg-violet-50/40 transition-all text-sm">
                        <ImagePlus className="size-5 shrink-0" />
                        <span>Click to attach an image</span>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </div>

                  {/* Save template toggle */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex items-center gap-3">
                      <Switch id="saveTemplate" checked={saveTemplate} onCheckedChange={setSaveTemplate} />
                      <div>
                        <Label htmlFor="saveTemplate" className="cursor-pointer text-sm font-medium">Save as template</Label>
                        <p className="text-xs text-slate-400">Reuse this message in future broadcasts</p>
                      </div>
                    </div>
                    {saveTemplate && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        <Input placeholder="Template title…" value={newTemplateTitle} onChange={e => setNewTemplateTitle(e.target.value)} className="h-9 rounded-lg w-full sm:flex-1 text-sm" />
                        <DropdownMenu>
                          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", className: "h-9 rounded-lg px-3 gap-1.5 font-normal text-sm border-slate-200 shrink-0" })}>
                            {newTemplateLang} <ChevronDown className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="rounded-xl">
                            <DropdownMenuRadioGroup value={newTemplateLang} onValueChange={setNewTemplateLang}>
                              {["English", "Hindi", "Gujarati"].map(l => <DropdownMenuRadioItem key={l} value={l}>{l}</DropdownMenuRadioItem>)}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: live preview */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Preview</Label>
                    <Button variant="ghost" size="sm" onClick={() => setPreview(generatePreview())} className="h-7 px-2.5 text-xs gap-1.5 text-slate-500 hover:text-violet-600">
                      <RefreshCw className="size-3" /> Regenerate
                    </Button>
                  </div>
                  {/* Phone frame */}
                  <div className="flex-1 rounded-2xl bg-slate-800 p-3 flex flex-col min-h-[280px]">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <div className="size-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">W</div>
                      <div>
                        <p className="text-white text-xs font-semibold">John Doe</p>
                        <p className="text-white/40 text-[9px]">online</p>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-end gap-2">
                      {preview ? (
                        <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-[#dcf8c6] px-3.5 py-2.5 shadow-sm">
                          <p className="text-slate-800 text-[12px] leading-relaxed whitespace-pre-wrap">{preview}</p>
                          <p className="text-slate-400 text-[9px] text-right mt-1">12:00 PM ✓✓</p>
                        </div>
                      ) : (
                        <div className="self-center text-white/25 text-xs">Your message preview appears here</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Recipients */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 px-4 sm:px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                    <Users className="size-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Select Recipients</p>
                    <p className="text-xs text-slate-500">{selectedCustomers.length} of {customers.length} customers selected</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedCustomers(customers.map(c => c.id))} className="rounded-xl h-8 text-xs">Select All</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCustomers([])} className="rounded-xl h-8 text-xs">Clear</Button>
                </div>
              </div>

              {/* Progress bar */}
              {customers.length > 0 && (
                <div className="px-4 sm:px-6 pt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span>{selectedCustomers.length} selected</span>
                    <span>{Math.round((selectedCustomers.length / customers.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#7c3aed] transition-all duration-300" style={{ width: `${(selectedCustomers.length / customers.length) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="p-4 sm:p-6">
                <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {customers.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm px-4">No customers with phone numbers found.</div>
                  ) : customers.map(c => {
                    const checked = selectedCustomers.includes(c.id)
                    return (
                      <label key={c.id} className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${checked ? "bg-violet-50/60" : "hover:bg-slate-50"}`}>
                        <div className={`shrink-0 size-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? "border-[#7c3aed] bg-[#7c3aed]" : "border-slate-200"}`}>
                          {checked && <CheckCircle2 className="size-3.5 text-white" />}
                          <input type="checkbox" checked={checked} onChange={() => toggleCustomer(c.id)} className="sr-only" />
                        </div>
                        <div className={`size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${checked ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                          {c.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${checked ? "text-slate-900" : "text-slate-700"}`}>{c.name}</p>
                          <p className="text-xs text-slate-400">{c.phone}</p>
                        </div>
                        {checked && <div className="shrink-0 size-2 rounded-full bg-violet-500" />}
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Send */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 sm:px-6 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <Send className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Send Messages</p>
                  <p className="text-xs text-slate-500">{sentCount} of {totalSelected} sent · Click each button to open WhatsApp</p>
                </div>
              </div>

              {/* Progress */}
              <div className="px-4 sm:px-6 pt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>{sentCount} sent</span>
                  <span>{Math.round((sentCount / Math.max(totalSelected, 1)) * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(sentCount / Math.max(totalSelected, 1)) * 100}%` }} />
                </div>
              </div>

              {/* Info banner */}
              <div className="mx-4 sm:mx-6 mt-4 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5">
                <Zap className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Each click opens WhatsApp with a personalized pre-filled message. Manual sending ensures 100% delivery and keeps your account safe from automated bans.
                </p>
              </div>

              <div className="p-4 sm:p-6">
                <div className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {selectedList.map(customer => {
                    const isSent = sentCustomerIds.includes(customer.id)
                    return (
                      <div key={customer.id} className={`flex items-center justify-between gap-4 px-4 py-3.5 transition-colors ${isSent ? "bg-emerald-50/40" : "hover:bg-slate-50"}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`shrink-0 size-8 rounded-full flex items-center justify-center text-xs font-bold ${isSent ? "bg-emerald-100 text-emerald-600" : "bg-violet-50 text-violet-600"}`}>
                            {isSent ? <CheckCircle2 className="size-4" /> : customer.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium text-sm ${isSent ? "text-slate-400 line-through" : "text-slate-900"}`}>{customer.name}</p>
                            <p className="text-xs text-slate-400">{customer.phone}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => sendManualMessage(customer)}
                          size="sm"
                          className={isSent
                            ? "rounded-xl h-8 text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 shadow-none"
                            : "rounded-xl h-8 text-xs bg-[#25D366] text-white hover:bg-[#128C7E] shadow-sm"
                          }
                        >
                          {isSent ? <><CheckCircle2 className="mr-1.5 size-3.5" />Sent</> : <><Send className="mr-1.5 size-3.5" />Send</>}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer nav */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 sm:px-6 py-4">
            <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : router.push("/broadcasts")} className="w-full sm:w-auto rounded-xl h-10 px-5 text-sm">
              {step > 1 ? <><ChevronLeft className="mr-1.5 size-4" />Back</> : "Cancel"}
            </Button>

            {step === 1 && (
              <Button onClick={() => { if (!message) return toast.error("Message is required"); if (saveTemplate && !newTemplateTitle) return toast.error("Template title required"); setStep(2) }}
                className="w-full sm:w-auto rounded-xl h-10 px-6 bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-900/15 text-sm">
                Next: Recipients <ChevronRight className="ml-1.5 size-4" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleNextToStep3} disabled={loading}
                className="w-full sm:w-auto rounded-xl h-10 px-6 bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-900/15 text-sm">
                {uploadingImage ? <><RefreshCw className="mr-2 size-4 animate-spin" />Uploading…</> : <>Continue to Send <ChevronRight className="ml-1.5 size-4" /></>}
              </Button>
            )}
            {step === 3 && (
              <Button onClick={() => router.push("/broadcasts")} disabled={sentCount < totalSelected}
                className="w-full sm:w-auto rounded-xl h-10 px-6 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md text-sm disabled:opacity-50">
                <CheckCircle2 className="mr-1.5 size-4" /> Done — All Sent
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Play, CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, ImagePlus, X, Save, Send, ChevronDown } from "lucide-react"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

type Customer = {
  id: number
  name: string
  phone: string | null
}

type Template = {
  id: number
  title: string
  content: string
  language: string
  image_url: string | null
  user_id: number | null
}

export default function CreateBroadcastPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form State
  const [message, setMessage] = useState("")
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [newTemplateTitle, setNewTemplateTitle] = useState("")
  const [newTemplateLang, setNewTemplateLang] = useState("English")

  const [filterLang, setFilterLang] = useState<string>("All")

  // Spintax Preview
  const [preview, setPreview] = useState("")

  // Send Progress
  const [sentCustomerIds, setSentCustomerIds] = useState<number[]>([])

  useEffect(() => {
    // Load customers
    fetch("/api/customers?limit=1000")
      .then(res => res.json())
      .then(data => {
        if (data.customers) {
          const formatted = data.customers.map((c: any) => ({
            id: c.id,
            name: c.customer_name,
            phone: c.phone
          }))
          // Filter out customers without phone numbers and strip non-numeric chars
          setCustomers(formatted.filter((c: Customer) => c.phone).map((c: Customer) => ({
             ...c,
             phone: c.phone?.replace(/\\D/g, '') || ''
          })))
        }
      })
      .catch(err => console.error("Failed to load customers:", err))

    // Load templates
    fetch("/api/whatsapp/templates")
      .then(res => res.json())
      .then(data => {
        if (data.templates) {
          setTemplates(data.templates)
          // Pre-select template if ID is in URL
          const tmplId = searchParams?.get("template")
          if (tmplId) {
             const tmpl = data.templates.find((t: Template) => t.id === Number(tmplId))
             if (tmpl) {
               setMessage(tmpl.content)
               // (Image handling for pre-existing templates would go here, omitting for brevity)
             }
          }
        }
      })
      .catch(err => console.error("Failed to load templates:", err))
  }, [searchParams])

  // Simple Spintax parser for preview
  const generatePreview = useCallback((name = "John Doe") => {
    let text = message
    
    // Replace literal '\n' strings with actual newlines
    text = text.replace(/\\n/g, '\n')
    
    // Replace Variables
    text = text.replace(/\{\{name\}\}/g, name)

    // Replace Spintax
    const spintaxRegex = /\{([^{}]*)\}/g
    text = text.replace(spintaxRegex, (match, contents) => {
      const parts = contents.split('|')
      return parts[Math.floor(Math.random() * parts.length)]
    })
    
    return text
  }, [message])

  useEffect(() => {
    setPreview(generatePreview())
  }, [message, generatePreview])

  const toggleCustomer = (id: number) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedCustomers(customers.map(c => c.id))
  }

  const deselectAll = () => {
    setSelectedCustomers([])
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB")
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleNextToStep3 = async () => {
    if (selectedCustomers.length === 0) {
      return toast.error("Select at least one customer")
    }

    setLoading(true)
    try {
      let finalImageUrl = null
      
      // Upload image if present
      if (imageFile) {
        setUploadingImage(true)
        const fd = new FormData()
        fd.append("file", imageFile)
        const upRes = await fetch("/api/whatsapp/templates/upload", { method: "POST", body: fd })
        const upData = await upRes.json()
        setUploadingImage(false)
        if (!upRes.ok) {
          toast.error(upData.error || "Image upload failed")
          setLoading(false)
          return
        }
        finalImageUrl = upData.url
      }

      // Save template if requested
      if (saveTemplate && newTemplateTitle) {
         await fetch("/api/whatsapp/templates", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             title: newTemplateTitle,
             content: message,
             language: newTemplateLang,
             image_url: finalImageUrl
           })
         })
         toast.success("Template saved!")
      }
      
      // Append image URL to message for manual sending
      if (finalImageUrl) {
         setMessage(prev => prev + `\\n\\nImage: ${finalImageUrl}`)
      }

      setStep(3)
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const sendManualMessage = (customer: Customer) => {
     if (!customer.phone) return
     
     // Generate personalized message
     const personalizedMsg = generatePreview(customer.name)
     const encodedMsg = encodeURIComponent(personalizedMsg)
     
     // Open wa.me in new tab
     window.open(`https://wa.me/${customer.phone}?text=${encodedMsg}`, '_blank')
     
     // Mark as sent in UI
     setSentCustomerIds(prev => [...prev, customer.id])
  }

  return (
    <>
      <PageHeader title="New Broadcast" />
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        {/* Stepper */}
        <div className="flex items-center justify-between px-12 relative mb-8">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full" />
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#7c3aed] -z-10 rounded-full transition-all duration-300 ease-in-out`} style={{ width: `${((step - 1) / 2) * 100}%` }} />
          
          {[1, 2, 3].map((num) => (
            <div key={num} className={`flex flex-col items-center gap-2 transition-all`}>
              <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${step >= num ? 'bg-[#7c3aed] text-white shadow-purple-950/20' : 'bg-white text-slate-400 border-2 border-slate-100'}`}>
                {step > num ? <CheckCircle2 className="size-5" /> : num}
              </div>
              <span className={`text-xs font-medium ${step >= num ? 'text-[#7c3aed]' : 'text-slate-400'}`}>
                {num === 1 ? 'Message' : num === 2 ? 'Recipients' : 'Send'}
              </span>
            </div>
          ))}
        </div>

        <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 1 && "Compose Message"}
              {step === 2 && "Select Recipients"}
              {step === 3 && "Send Messages"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Use Spintax like {Hi|Hello} and variables like {{name}} to personalize your message."}
              {step === 2 && "Choose which customers will receive this broadcast."}
              {step === 3 && "Click 'Send' for each customer to manually trigger WhatsApp and ensure reliable delivery."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* STEP 1: MESSAGE */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="message">Message Template</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger className={buttonVariants({ variant: "outline", className: "h-8 rounded-lg px-3 flex gap-2 font-normal text-xs border-slate-200" })}>
                          {filterLang === "All" ? "All Languages" : filterLang} <ChevronDown className="size-3 text-slate-500" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-xl">
                          <DropdownMenuRadioGroup value={filterLang} onValueChange={setFilterLang}>
                            <DropdownMenuRadioItem value="All">All Languages</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="English">English</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Hindi">Hindi</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="Gujarati">Gujarati</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {templates.filter(t => filterLang === "All" || t.language === filterLang).map((tpl, i) => (
                        <Button 
                          key={i} 
                          type="button" 
                          variant={tpl.user_id ? "secondary" : "outline"} 
                          size="sm" 
                          onClick={() => setMessage(tpl.content)}
                          className={`rounded-full h-8 text-xs ${tpl.user_id ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
                        >
                          {tpl.title}
                        </Button>
                      ))}
                    </div>

                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[180px] rounded-2xl border-slate-200 bg-white focus:border-[#7c3aed] resize-none"
                    />
                    <p className="text-xs text-slate-500">Variables: {'{{name}}'}. Spintax: {'{Option 1|Option 2}'}</p>

                    {/* ── Image Attachment ── */}
                    <div>
                      <Label className="mb-2 block">Attach Image <span className="text-slate-400 font-normal">(optional, max 5MB)</span></Label>
                      {imagePreview ? (
                        <div className="relative w-fit">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-36 rounded-2xl object-cover border border-slate-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={clearImage}
                            className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow hover:bg-rose-50 hover:border-rose-300 transition-colors"
                          >
                            <X className="size-3.5 text-slate-500" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-3 w-full border-2 border-dashed border-slate-200 rounded-2xl px-4 py-4 text-slate-400 hover:border-[#7c3aed] hover:text-[#7c3aed] hover:bg-purple-50/50 transition-all text-sm"
                        >
                          <ImagePlus className="size-5 shrink-0" />
                          Click to choose an image to send with the message
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <p className="text-xs text-slate-500 mt-2">The image will be uploaded and a link appended to your message.</p>
                    </div>

                    <div className="pt-2 flex items-center space-x-2">
                       <Switch id="saveTemplate" checked={saveTemplate} onCheckedChange={setSaveTemplate} />
                       <Label htmlFor="saveTemplate" className="cursor-pointer">Save as new template</Label>
                    </div>
                    {saveTemplate && (
                       <div className="flex gap-2">
                         <Input 
                            placeholder="Template Title" 
                            value={newTemplateTitle}
                            onChange={e => setNewTemplateTitle(e.target.value)}
                            className="h-10 rounded-xl flex-1"
                         />
                         <DropdownMenu>
                            <DropdownMenuTrigger className={buttonVariants({ variant: "outline", className: "h-10 rounded-xl px-4 flex gap-2 font-normal border-slate-200 shrink-0" })}>
                              {newTemplateLang} <ChevronDown className="size-4 text-slate-500" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="rounded-xl">
                              <DropdownMenuRadioGroup value={newTemplateLang} onValueChange={setNewTemplateLang}>
                                <DropdownMenuRadioItem value="English">English</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Hindi">Hindi</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Gujarati">Gujarati</DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Live Preview</Label>
                      <Button variant="ghost" size="sm" onClick={() => setPreview(generatePreview())} className="h-6 px-2 text-xs">
                        <RefreshCw className="size-3 mr-1" /> Regenerate
                      </Button>
                    </div>
                    <div className="min-h-[200px] rounded-2xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-sm text-slate-700 font-sans shadow-inner">
                      {preview}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: RECIPIENTS */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500 font-medium">
                    {selectedCustomers.length} selected of {customers.length} total
                  </p>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={selectAll} className="rounded-xl h-8 text-xs">Select All</Button>
                    <Button variant="outline" size="sm" onClick={deselectAll} className="rounded-xl h-8 text-xs">Deselect All</Button>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 divide-y divide-slate-100">
                  {customers.map(customer => (
                    <label key={customer.id} className="flex items-center p-3 hover:bg-slate-100 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => toggleCustomer(customer.id)}
                        className="mr-4 size-4 rounded text-[#7c3aed] focus:ring-[#7c3aed]"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.phone}</p>
                      </div>
                    </label>
                  ))}
                  {customers.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      No customers found with phone numbers.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: SEND MESSAGES */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-800">Ready to send</h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        Click the send button next to each customer. It will open WhatsApp with a pre-filled personalized message. 
                        Sending manually ensures 100% delivery and keeps your WhatsApp account safe from automated bans.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                  {customers.filter(c => selectedCustomers.includes(c.id)).map(customer => {
                    const isSent = sentCustomerIds.includes(customer.id)
                    return (
                      <div key={customer.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className={`font-medium ${isSent ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.phone}</p>
                        </div>
                        <Button
                           onClick={() => sendManualMessage(customer)}
                           variant={isSent ? "outline" : "default"}
                           className={isSent ? "rounded-xl h-9 text-emerald-600 border-emerald-200 bg-emerald-50" : "rounded-xl h-9 bg-[#25D366] text-white hover:bg-[#128C7E]"}
                        >
                           {isSent ? <><CheckCircle2 className="mr-2 size-4" /> Sent</> : <><Send className="mr-2 size-4" /> Send</>}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </CardContent>
          <CardFooter className="border-t border-slate-100 bg-slate-50/50 p-6 rounded-b-[1.75rem] flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : router.push("/broadcasts")}
              className="rounded-2xl h-11 px-6"
            >
              {step > 1 ? <><ChevronLeft className="mr-2 size-4" /> Back</> : "Cancel"}
            </Button>
            
            {step === 1 && (
              <Button
                onClick={() => {
                  if (!message) return toast.error("Message is required")
                  if (saveTemplate && !newTemplateTitle) return toast.error("Template title is required")
                  setStep(2)
                }}
                className="rounded-2xl h-11 px-8 bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-950/10"
              >
                Next Step <ChevronRight className="ml-2 size-4" />
              </Button>
            )}

            {step === 2 && (
              <Button
                onClick={handleNextToStep3}
                disabled={loading}
                className="rounded-2xl h-11 px-8 bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-950/10"
              >
                {uploadingImage ? (
                  <><RefreshCw className="mr-2 size-4 animate-spin" /> Uploading image…</>
                ) : (
                  <>Continue to Sending <ChevronRight className="ml-2 size-4" /></>
                )}
              </Button>
            )}

            {step === 3 && (
               <Button
                 onClick={() => router.push("/broadcasts")}
                 className="rounded-2xl h-11 px-8 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                 disabled={sentCustomerIds.length < selectedCustomers.length}
               >
                 Done
               </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  )
}

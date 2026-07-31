"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Send, Users, MessageSquare, Settings2, Play, CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

const PRESET_TEMPLATES = [
  {
    title: "Summer Sale ☀️",
    content: "Hi {{name}}! ☀️\n\n{We're running|Check out} our exclusive Summer Sale! Get {20%|25%|30%} off all {bookings|services} if you book this week. 🏖️\n\n{Reply|Message us} to claim your discount!"
  },
  {
    title: "Reminder / Follow-up 📅",
    content: "{Hey|Hi} {{name}} 👋\n\nJust reaching out to see if you're still interested in booking a session with us. 🗓️ Let me know if you have any questions!\n\nBest, ArtistOS"
  },
  {
    title: "New Service Alert 🚀",
    content: "Exciting news, {{name}}! 🎉\n\nWe just launched a brand new {service|offering} that you might love. ✨ Check our portfolio and {book now|let us know} if you want to try it out!"
  },
  {
    title: "Thank You 💖",
    content: "{Hi|Hello} {{name}}! 💖\n\nJust wanted to send a quick {note|message} to say thank you for being a wonderful {client|customer}. We truly appreciate your support! 🙏"
  },
  {
    title: "Holiday Greetings 🎄",
    content: "Happy Holidays, {{name}}! 🎄✨\n\nWishing you and your loved ones a {joyful|wonderful} season. Stay safe and {see you soon|talk to you soon}! 🎁"
  }
]

export default function CreateBroadcastPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Form State
  const [campaignName, setCampaignName] = useState("")
  const [message, setMessage] = useState("Hi {{name}},\n\n{This is a test|Testing} message!")
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])
  const [minDelay, setMinDelay] = useState(240) // 4 minutes
  const [maxDelay, setMaxDelay] = useState(300) // 5 minutes
  const [businessHours, setBusinessHours] = useState(true)

  // Spintax Preview
  const [preview, setPreview] = useState("")

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
          // Filter out customers without phone numbers
          setCustomers(formatted.filter((c: Customer) => c.phone))
        }
      })
      .catch(err => console.error("Failed to load customers:", err))
  }, [])

  // Simple Spintax parser for preview
  const generatePreview = useCallback(() => {
    let text = message
    
    // Replace Spintax
    const spintaxRegex = /\{([^{}]*)\}/g
    text = text.replace(spintaxRegex, (match, contents) => {
      const parts = contents.split('|')
      return parts[Math.floor(Math.random() * parts.length)]
    })

    // Replace Variables
    text = text.replace(/\{\{name\}\}/g, "John Doe")
    
    setPreview(text)
  }, [message])

  useEffect(() => {
    generatePreview()
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

  const handleSubmit = async () => {
    if (!campaignName || !message || selectedCustomers.length === 0) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          message_template: message,
          customer_ids: selectedCustomers,
          min_delay_sec: minDelay,
          max_delay_sec: maxDelay,
          business_hours_only: businessHours
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success("Broadcast campaign created and started!")
        router.push("/broadcasts")
      } else {
        toast.error(data.error || "Failed to create broadcast")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader title="Create Broadcast" />
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
                {num === 1 ? 'Message' : num === 2 ? 'Recipients' : 'Settings'}
              </span>
            </div>
          ))}
        </div>

        <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 1 && "Compose Message"}
              {step === 2 && "Select Recipients"}
              {step === 3 && "Campaign Settings"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Use Spintax like {Hi|Hello} and variables like {{name}} to personalize your message."}
              {step === 2 && "Choose which customers will receive this broadcast."}
              {step === 3 && "Configure sending limits to keep your account safe from spam filters."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* STEP 1: MESSAGE */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Summer Promotion 2026"
                    className="h-11 rounded-2xl border-slate-200 bg-white focus:border-[#7c3aed]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label htmlFor="message">Message Template</Label>
                    
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TEMPLATES.map((tpl, i) => (
                        <Button 
                          key={i} 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setMessage(tpl.content)}
                          className="rounded-full h-8 text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800"
                        >
                          {tpl.title}
                        </Button>
                      ))}
                    </div>

                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[200px] rounded-2xl border-slate-200 bg-white focus:border-[#7c3aed] resize-none"
                    />
                    <p className="text-xs text-slate-500">Variables: {'{{name}}'}. Spintax: {'{Option 1|Option 2}'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Live Preview</Label>
                      <Button variant="ghost" size="sm" onClick={generatePreview} className="h-6 px-2 text-xs">
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

            {/* STEP 3: SETTINGS */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6">
                  <div className="flex gap-3">
                    <AlertCircle className="size-5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-800">Anti-Ban Protection Active</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        To prevent WhatsApp from flagging your account, we enforce randomized delays between messages. The default (4-5 minutes) is highly recommended.
                      </p>
                    </div>
                  </div>
                </div>

                  {/* Delays are now hardcoded and enforced by the backend to ensure account safety */}

                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white">
                  <div>
                    <Label className="text-base font-medium">Business Hours Only</Label>
                    <p className="text-sm text-slate-500">Pause sending automatically between 9PM and 8AM</p>
                  </div>
                  <Switch 
                    checked={businessHours} 
                    onCheckedChange={setBusinessHours} 
                  />
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
            
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (step === 1 && !campaignName) return toast.error("Campaign name is required")
                  if (step === 1 && !message) return toast.error("Message is required")
                  if (step === 2 && selectedCustomers.length === 0) return toast.error("Select at least one customer")
                  setStep(step + 1)
                }}
                className="rounded-2xl h-11 px-8 bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-950/10"
              >
                Next Step <ChevronRight className="ml-2 size-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-2xl h-11 px-8 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-950/10"
              >
                {loading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
                Launch Campaign
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  )
}

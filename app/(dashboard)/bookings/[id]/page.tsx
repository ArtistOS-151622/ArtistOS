"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Image as ImageIcon,
  MapPin,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  CheckCircle2,
  Send,
  MessageCircle,
  Check,
  ChevronDown,
  Edit,
  Trash,
  X,
  Loader2,
  ExternalLink,
  PhoneCall,
  Navigation,
  Map,
  Receipt,
  FolderPlus,
} from "lucide-react";

import { PageHeader } from "@/components/common/dashboard/dashboard-header-context";
import { AppLoader } from "@/components/common/shared/app-loader";
import { AppModal } from "@/components/common/shared/app-modal";
import { FloatingInput } from "@/components/common/shared/floating-input";
import { FloatingTextarea } from "@/components/common/shared/floating-input";
import { FloatingDropdown } from "@/components/common/shared/floating-dropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/common/shared/date-picker";
import { BookingPortfolioTab } from "@/components/portfolio/booking-portfolio-tab";

// Real DB Types
type BookingService = {
  id: number;
  service_name: string;
  price: number;
  quantity: number;
};
type BookingDetail = {
  id: number;
  user_booking_index?: number;
  status: "pending" | "confirmed" | "completed" | "canceled";
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_address: string;
  additional_request: string | null;
  customer: { customer_name: string; phone: string; email: string };
  services: BookingService[];
  discount: number;
  additional_charges: AdditionalCharge[];
};
type AdditionalCharge = {
  id: number;
  charge_name: string;
  quantity: number;
  rate: number;
};
type Payment = {
  id: number;
  payment_type: string;
  payment_method: string;
  amount: number;
  payment_date: string;
  remark: string | null;
};
type Expense = {
  id: number;
  expense_name: string;
  amount: number;
  expense_date: string;
  description: string | null;
};
type ExpenseCategory = { id: number; category_name: string };

function BookingDetailsSkeleton() {
  return (
    <>
      <PageHeader title="Booking Details" />

      {/* Header Actions Card Skeleton */}
      <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] mb-4 p-3 sm:p-5">
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <Skeleton className="size-8 sm:size-10 rounded-xl sm:rounded-2xl shrink-0 bg-slate-100" />
            <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Skeleton className="h-5 sm:h-7 w-32 sm:w-48 bg-slate-100" />
              <Skeleton className="hidden sm:inline-block h-4 w-24 bg-slate-100" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Skeleton className="h-8 sm:h-10 w-20 sm:w-28 rounded-xl bg-slate-100" />
            <Skeleton className="size-8 sm:size-10 rounded-xl bg-slate-100" />
          </div>
        </div>
      </Card>

      {/* Overview Card Skeleton */}
      <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* 1. Client Card Section */}
            <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0 w-full">
                <Skeleton className="size-11 rounded-xl shrink-0 bg-slate-100" />
                <div className="min-w-0 flex flex-col justify-center gap-1.5 w-full">
                  <Skeleton className="h-3 w-20 bg-slate-100" />
                  <Skeleton className="h-4 w-32 bg-slate-100" />
                </div>
              </div>
            </div>

            {/* 2. Event Location Section */}
            <div className="hidden md:flex p-3.5 sm:p-4 items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0 w-full">
                <Skeleton className="size-11 rounded-xl shrink-0 bg-slate-100" />
                <div className="min-w-0 flex flex-col justify-center gap-1.5 w-full">
                  <Skeleton className="h-3 w-24 bg-slate-100" />
                  <Skeleton className="h-4 w-40 bg-slate-100" />
                </div>
              </div>
            </div>

            {/* 3. Financial Overview Section */}
            <div className="hidden md:flex p-3.5 sm:p-4 flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-24 bg-slate-100" />
                <Skeleton className="h-5 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-1 w-full bg-slate-100" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-slate-100" />
                  <Skeleton className="h-3 w-16 bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs List Skeleton */}
      <div className="w-full gap-0">
        <div className="w-full overflow-x-auto hide-scrollbar">
          <div className="flex sm:grid-cols-4 w-max min-w-full sm:w-full max-w-md h-20 items-center justify-center rounded-2xl bg-slate-100/80 p-1 mb-4 mx-auto sm:mx-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 px-4 sm:px-2 h-full py-2">
                <Skeleton className="w-full h-full rounded-xl bg-slate-200/50" />
              </div>
            ))}
          </div>
        </div>

        {/* Tab Content Skeleton (Quotation-like layout) */}
        <div className="space-y-6">
          <Card className="rounded-[1.75rem] border-slate-100 shadow-md shadow-purple-950/5 p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-40 bg-slate-100" />
                <Skeleton className="h-9 w-24 rounded-lg bg-slate-100" />
              </div>
              <div className="space-y-3 mt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center p-3 sm:p-4 border border-slate-100 rounded-2xl">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-5 w-32 sm:w-48 bg-slate-100" />
                      <Skeleton className="h-3 w-20 sm:w-24 bg-slate-100" />
                    </div>
                    <Skeleton className="h-5 w-20 sm:w-28 bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function BookingDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const goBackToBookings = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/bookings");
    }
  };

  const [loading, setLoading] = useState(true);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateType, setUpdateType] = useState<
    "quotation" | "reminder" | "custom"
  >("quotation");
  const [updateSent, setUpdateSent] = useState(false);

  // Payment Modal State (Add)
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState("Advance");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [paymentRemark, setPaymentRemark] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Payment Edit Modal State
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentType, setEditPaymentType] = useState("Advance");
  const [editPaymentMethod, setEditPaymentMethod] = useState("UPI");
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editPaymentRemark, setEditPaymentRemark] = useState("");

  // Add Expense Modal State
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [expenseSuccess, setExpenseSuccess] = useState(false);

  // Expense Edit Modal State
  const [editExpenseOpen, setEditExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editExpenseName, setEditExpenseName] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseDescription, setEditExpenseDescription] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  // Custom Expense Manager Modal State
  const [customExpenseModalOpen, setCustomExpenseModalOpen] = useState(false);
  // Edit Services Modal State
  const [editServicesOpen, setEditServicesOpen] = useState(false);
  const [editingServices, setEditingServices] = useState<BookingService[]>([]);
  const [availableServices, setAvailableServices] = useState<
    { id: number; service_name: string; price: number }[]
  >([]);

  // Additional Charges Inline State
  const [newChargeName, setNewChargeName] = useState("");
  const [newChargeQty, setNewChargeQty] = useState("1");
  const [newChargeRate, setNewChargeRate] = useState("");

  const [editingChargeId, setEditingChargeId] = useState<number | null>(null);
  const [editChargeName, setEditChargeName] = useState("");
  const [editChargeQty, setEditChargeQty] = useState("");
  const [editChargeRate, setEditChargeRate] = useState("");

  // Discount Inline State
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [tempDiscount, setTempDiscount] = useState("");

  // Toggle for Additional Charges Card
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);

  // Core booking data
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  // Custom Expenses UI state (synced from expenseCategories)
  const [customExpenses, setCustomExpenses] = useState<
    { id: string; name: string }[]
  >([]);
  const [newCustomExpense, setNewCustomExpense] = useState("");
  const [editingCustomExpenseId, setEditingCustomExpenseId] = useState<
    string | null
  >(null);
  const [editingCustomExpenseName, setEditingCustomExpenseName] = useState("");

  // Sync real expense categories into the custom expense state
  useEffect(() => {
    setCustomExpenses(
      expenseCategories.map((c) => ({
        id: String(c.id),
        name: c.category_name,
      })),
    );
  }, [expenseCategories]);

  // Action Loading States
  const [isAddingCustomExpense, setIsAddingCustomExpense] = useState(false);
  const [isUpdatingCustomExpense, setIsUpdatingCustomExpense] = useState(false);
  const [deletingCustomExpenseId, setDeletingCustomExpenseId] = useState<
    string | null
  >(null);

  const [isAddingCharge, setIsAddingCharge] = useState(false);
  const [isUpdatingCharge, setIsUpdatingCharge] = useState(false);
  const [deletingChargeId, setDeletingChargeId] = useState<number | null>(null);

  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false);
  const [isSavingServices, setIsSavingServices] = useState(false);

  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(
    null,
  );

  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(
    null,
  );

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleAddCustomExpense = async () => {
    if (!newCustomExpense.trim()) return;
    const res = await fetch(`/api/bookings/${bookingId}/expense-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_name: newCustomExpense.trim() }),
    });
    const data = await res.json();
    if (data.category) {
      setExpenseCategories((prev) => [...prev, data.category]);
      setNewCustomExpense("");
    }
  };

  const handleUpdateCustomExpense = async () => {
    if (!editingCustomExpenseName.trim() || !editingCustomExpenseId) return;
    setIsUpdatingCustomExpense(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/expense-categories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: editingCustomExpenseId,
          category_name: editingCustomExpenseName.trim(),
        }),
      });
      const data = await res.json();
      if (data.category) {
        setExpenseCategories((prev) =>
          prev.map((c) =>
            c.id === Number(editingCustomExpenseId) ? data.category : c,
          ),
        );
        setEditingCustomExpenseId(null);
        setEditingCustomExpenseName("");
      }
    } finally {
      setIsUpdatingCustomExpense(false);
    }
  };

  const handleDeleteCustomExpense = async (id: string) => {
    setDeletingCustomExpenseId(id);
    try {
      const res = await fetch(
        `/api/bookings/${bookingId}/expense-categories?categoryId=${id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setExpenseCategories((prev) => prev.filter((c) => String(c.id) !== id));
      }
    } finally {
      setDeletingCustomExpenseId(null);
    }
  };

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/bookings/${bookingId}/detail`).then((r) => r.json()),
      fetch(`/api/bookings/${bookingId}/payments`).then((r) => r.json()),
      fetch(`/api/bookings/${bookingId}/expenses`).then((r) => r.json()),
      fetch(`/api/bookings/${bookingId}/expense-categories`).then((r) =>
        r.json(),
      ),
      fetch(`/api/services`).then((r) => r.json()), // Global services for add-new
    ])
      .then(
        ([detailRes, paymentsRes, expensesRes, categoriesRes, servicesRes]) => {
          if (detailRes.error) {
            setError(detailRes.error);
            return;
          }

          const b = detailRes.booking as BookingDetail;
          // Gate: redirect non-actionable statuses
          if (b.status === "pending" || b.status === "canceled") {
            router.replace("/bookings");
            return;
          }

          setBooking(b);
          setPayments(paymentsRes.payments ?? []);
          setExpenses(expensesRes.expenses ?? []);
          setExpenseCategories(categoriesRes.categories ?? []);
          setAvailableServices(servicesRes.services ?? []);

          // Auto-show additional charges if they exist
          if (b.additional_charges?.length > 0) {
            setShowAdditionalCharges(true);
          }
        },
      )
      .catch(() => setError("Failed to load booking. Please try again."))
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  const handleAddAdditionalCharge = async () => {
    if (!newChargeName.trim() || !newChargeRate) return;
    setIsAddingCharge(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/additional-charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charge_name: newChargeName,
          quantity: Number(newChargeQty) || 1,
          rate: Number(newChargeRate),
        }),
      });
      const data = await res.json();
      if (data.charge && booking) {
        setBooking({
          ...booking,
          additional_charges: [...booking.additional_charges, data.charge],
        });
        setNewChargeName("");
        setNewChargeQty("1");
        setNewChargeRate("");
      }
    } finally {
      setIsAddingCharge(false);
    }
  };

  const handleUpdateAdditionalCharge = async () => {
    if (!editChargeName.trim() || !editChargeRate || editingChargeId === null)
      return;
    setIsUpdatingCharge(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/additional-charges`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargeId: editingChargeId,
          charge_name: editChargeName,
          quantity: Number(editChargeQty) || 1,
          rate: Number(editChargeRate),
        }),
      });
      const data = await res.json();
      if (data.charge && booking) {
        setBooking({
          ...booking,
          additional_charges: booking.additional_charges.map((c) =>
            c.id === editingChargeId ? data.charge : c,
          ),
        });
        setEditingChargeId(null);
      }
    } finally {
      setIsUpdatingCharge(false);
    }
  };

  const handleDeleteAdditionalCharge = async (chargeId: number) => {
    setDeletingChargeId(chargeId);
    try {
      const res = await fetch(
        `/api/bookings/${bookingId}/additional-charges?chargeId=${chargeId}`,
        { method: "DELETE" },
      );
      if (res.ok && booking) {
        setBooking({
          ...booking,
          additional_charges: booking.additional_charges.filter(
            (c) => c.id !== chargeId,
          ),
        });
      }
    } finally {
      setDeletingChargeId(null);
    }
  };

  const handleUpdateDiscount = async () => {
    const parsed = Number(tempDiscount);
    if (Number.isNaN(parsed) || parsed < 0) return;

    const res = await fetch(`/api/bookings/${bookingId}/discount`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discount: parsed }),
    });
    const data = await res.json();
    if (data.success && booking) {
      setBooking({ ...booking, discount: data.discount });
      setIsEditingDiscount(false);
    }
  };

  const handleSendUpdate = (method: "whatsapp" | "email") => {
    if (!booking) return;
    let message = "";
    let subject = "";

    if (updateType === "quotation") {
      subject = `Quotation for your booking - #${booking.id}`;
      message = `Hi ${booking.customer.customer_name},\n\nHere is the detailed quotation for your upcoming booking on ${new Date(booking.booking_date).toLocaleDateString()}.\n\nTotal Value: ₹${grandTotal.toLocaleString()}\n\nPlease let us know if you have any questions.\n\nThank you!`;
    } else {
      subject = `Payment Reminder - #${booking.id}`;
      message = `Hi ${booking.customer.customer_name},\n\nThis is a gentle reminder that a payment of ₹${dueAmount.toLocaleString()} is currently due for your booking on ${new Date(booking.booking_date).toLocaleDateString()}.\n\nPlease let us know when this has been cleared.\n\nThank you!`;
    }

    if (method === "whatsapp") {
      const cleanPhone = booking.customer.phone.replace(/\D/g, "");
      window.open(
        `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
        "_blank",
      );
    } else if (method === "email") {
      window.open(
        `mailto:${booking.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
        "_blank",
      );
    }

    setUpdateSent(true);
    setTimeout(() => {
      setUpdateOpen(false);
      setTimeout(() => setUpdateSent(false), 500);
    }, 2000);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quotation-${booking?.user_booking_index ?? booking?.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return <BookingDetailsSkeleton />;
  }

  if (error || !booking) {
    return (
      <>
        <PageHeader title="Booking Details" />
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-red-500">
            {error ?? "Booking not found."}
          </p>
          <Button onClick={goBackToBookings} className="mt-4 rounded-xl">
            Back to Bookings
          </Button>
        </div>
      </>
    );
  }

  // Derived calculations from live data
  const servicesTotal = booking.services.reduce(
    (acc, s) => acc + Number(s.price) * (s.quantity ?? 1),
    0,
  );
  const additionalTotal = showAdditionalCharges
    ? booking.additional_charges.reduce(
        (acc, c) => acc + Number(c.rate) * Number(c.quantity),
        0,
      )
    : 0;

  const subTotal = servicesTotal + additionalTotal;
  const grandTotal = Math.max(0, subTotal - booking.discount);

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const dueAmount = grandTotal - totalPaid;
  const paidPercentage = grandTotal > 0 ? (totalPaid / grandTotal) * 100 : 0;

  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const netProfit = grandTotal - totalExpenses;
  const profitMargin =
    grandTotal > 0 ? ((netProfit / grandTotal) * 100).toFixed(1) : "0.0";

  const statusColors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    canceled: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <>
      <PageHeader title="Booking Details" />

      {/* Header Actions Card */}
      <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] mb-4 p-3 sm:p-5">
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBackToBookings}
              className="size-8 sm:size-10 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 shrink-0"
              title="Back to Bookings"
            >
              <ArrowLeft className="size-3.5 sm:size-4" />
            </Button>
            <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
              <h1 className="text-sm sm:text-xl lg:text-2xl font-extrabold tracking-tight text-slate-900 truncate">
                {new Date(booking.booking_date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h1>
              <span className="hidden sm:inline-block text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-sm font-semibold text-slate-500 sm:text-slate-600 truncate">
                <Clock className="size-3 sm:size-4 text-purple-600/80 shrink-0" />
                {booking.start_time.substring(0, 5)} -{" "}
                {booking.end_time.substring(0, 5)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={`hidden sm:inline-flex rounded-full px-3.5 py-1 font-bold uppercase tracking-wider text-[11px] border shadow-2xs items-center gap-1.5 ${statusColors[booking.status]}`}
            >
              <span className="size-1.5 rounded-full bg-current animate-pulse" />
              {booking.status}
            </Badge>
            <Button
              onClick={() => setUpdateOpen(true)}
              className="rounded-xl h-8 sm:h-9 px-2.5 sm:px-4 bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-950/20 flex items-center justify-center gap-2"
              title="Send Update"
            >
              <Send className="size-3.5" />
              <span className="hidden sm:inline text-xs sm:text-sm font-medium">
                Send Update
              </span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Overview Card (Single Unified Container) */}
      <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* 1. Client Card Section */}
            <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-11 rounded-xl border-2 border-purple-200 bg-purple-50 flex items-center justify-center text-[#7c3aed] shadow-2xs shrink-0">
                  <User className="size-5 text-[#7c3aed]" />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7c3aed] mb-0.5">
                    Customer Details
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">
                    {booking.customer.customer_name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${booking.customer.phone}`}
                  className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white transition-all border border-purple-100"
                  title="Call Client"
                >
                  <PhoneCall className="size-3.5" />
                </a>
                <a
                  href={`https://wa.me/${booking.customer.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-[#25D366] hover:text-white transition-all border border-emerald-100"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle className="size-3.5" />
                </a>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(booking.booking_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="md:hidden flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                  title="Open Google Maps"
                >
                  <Navigation className="size-3.5" />
                </a>
              </div>
            </div>

            {/* 2. Event Location Section */}
            <div className="hidden md:flex p-3.5 sm:p-4 items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-11 rounded-xl border-2 border-purple-200 bg-purple-50 flex items-center justify-center text-[#7c3aed] shadow-2xs shrink-0">
                  <MapPin className="size-5 text-[#7c3aed]" />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7c3aed] mb-0.5">
                    Event Location
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                    {booking.booking_address}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(booking.booking_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white transition-all border border-purple-100"
                  title="Open Google Maps"
                >
                  <Navigation className="size-3.5" />
                </a>
              </div>
            </div>

            {/* 3. Financial Overview Section */}
            <div className="hidden md:flex p-3.5 sm:p-4 flex-col justify-between">
              {/* <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Total Value
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold px-2 py-0.5 border ${
                    paidPercentage >= 100
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : paidPercentage > 0
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {paidPercentage >= 100
                    ? "Fully Paid"
                    : paidPercentage > 0
                      ? `${Math.round(paidPercentage)}% Paid`
                      : "Unpaid"}
                </Badge>
              </div> */}

              <div className="flex items-center justify-between gap-2 my-0.5">
                <h3 className="text-base sm:text-lg font-extrabold text-[#7c3aed] tracking-tight">
                  ₹{grandTotal.toLocaleString()}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold px-2 py-0.5 border ${
                    paidPercentage >= 100
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : paidPercentage > 0
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {paidPercentage >= 100
                    ? "Fully Paid"
                    : paidPercentage > 0
                      ? `${Math.round(paidPercentage)}% Paid`
                      : "Unpaid"}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Progress
                  value={paidPercentage}
                  className="h-1 bg-purple-100/80"
                />
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />₹
                    {totalPaid.toLocaleString()} paid
                  </span>
                  {dueAmount > 0 ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <span className="size-1.5 rounded-full bg-amber-500" />₹
                      {dueAmount.toLocaleString()} due
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Settled
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs Segment */}
      <Tabs defaultValue="quotation" className="w-full gap-0">
        <div className="w-full overflow-x-auto hide-scrollbar">
          <TabsList className="flex sm:grid-cols-4 w-max min-w-full sm:w-full max-w-md h-20 items-center justify-center rounded-2xl bg-slate-100/80 p-1 mb-4 text-slate-500 mx-auto sm:mx-0">
            <TabsTrigger
              value="quotation"
              className="flex-1 px-4 sm:px-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-sm transition-all h-full text-xs sm:text-sm font-semibold"
            >
              Quotation
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="flex-1 px-4 sm:px-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-sm transition-all h-full text-xs sm:text-sm font-semibold"
            >
              Payments
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="flex-1 px-4 sm:px-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-sm transition-all h-full text-xs sm:text-sm font-semibold"
            >
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value="portfolio"
              className="flex-1 px-4 sm:px-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-sm transition-all h-full text-xs sm:text-sm font-semibold"
            >
              Portfolio
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. QUOTATION TAB */}
        <TabsContent
          value="quotation"
          className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <Card className="rounded-[1.75rem] border-slate-100 shadow-md shadow-purple-950/5">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b !p-4">
              {/* Row 1 on Mobile: Title on Left, Icon-only Action Buttons on Right */}
              <div className="flex items-center justify-between w-full sm:w-auto">
                <CardTitle className="text-base sm:text-lg">Service Breakdown</CardTitle>
                <div className="flex items-center gap-2 sm:hidden">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-8 w-8 text-[#7c3aed] border-purple-200 hover:bg-purple-50 shrink-0"
                    onClick={() => {
                      setEditingServices([...booking.services]);
                      setEditServicesOpen(true);
                    }}
                    title="Edit Services"
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-8 w-8 shrink-0"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    title="Download PDF"
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Row 2 on Mobile / Right side on Desktop */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-start gap-2 border-slate-200 sm:pr-4 sm:border-r w-full sm:w-auto">
                  <Label
                    htmlFor="additional-charges-toggle"
                    className="text-xs sm:text-sm font-medium text-slate-600 cursor-pointer"
                  >
                    Additional Charges
                  </Label>
                  <Switch
                    id="additional-charges-toggle"
                    checked={showAdditionalCharges}
                    onCheckedChange={setShowAdditionalCharges}
                  />
                </div>

                {/* Desktop Buttons */}
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 text-[#7c3aed] border-purple-200 hover:bg-purple-50"
                    onClick={() => {
                      setEditingServices([...booking.services]);
                      setEditServicesOpen(true);
                    }}
                  >
                    <Edit className="mr-2 size-4" /> Edit Services
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 size-4" />
                    )}
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4">
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
                {/* Mobile View: Clean Service Item Cards */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {booking.services.map((service, idx) => (
                    <div key={idx} className="p-3.5 space-y-1.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-slate-900 text-sm leading-snug">
                          {service.service_name}
                        </h4>
                        <span className="font-extrabold text-[#7c3aed] text-sm shrink-0">
                          ₹{(Number(service.price) * service.quantity).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span>
                          Qty: <strong className="text-slate-700 font-semibold">{service.quantity}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          Rate: <strong className="text-slate-700 font-semibold">₹{Number(service.price).toLocaleString()}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Full Data Table */}
                <table className="w-full text-sm text-left hidden sm:table">
                  <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Service Name</th>
                      <th className="px-6 py-3.5 font-semibold text-center">Qty</th>
                      <th className="px-6 py-3.5 font-semibold text-right">
                        Unit Price
                      </th>
                      <th className="px-6 py-3.5 font-semibold text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {booking.services.map((service, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {service.service_name}
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-slate-700">
                          {service.quantity}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          ₹{Number(service.price).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                          ₹
                          {(
                            Number(service.price) * service.quantity
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Additional Charges Card (Togglable) */}
          {showAdditionalCharges && (
            <Card className="rounded-[1.75rem] border-slate-100 shadow-md shadow-purple-950/5 mt-6 animate-in slide-in-from-top-4 fade-in duration-300">
              <CardHeader className="flex flex-row items-center justify-between !p-4 border-b">
                <div>
                  <CardTitle className="text-lg">Additional Charges</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Add New Charge Inline Row */}
                <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 mb-4">
                  {/* Charge Name (Full width on mobile, 50% on desktop) */}
                  <Input
                    placeholder="Charge Name (e.g. Travel)"
                    value={newChargeName}
                    onChange={(e) => setNewChargeName(e.target.value)}
                    className="h-10 sm:h-11 bg-white w-full md:w-1/2"
                  />

                  {/* Qty, Rate & Add Button (All 3 in 1 row on mobile, 50% total on desktop) */}
                  <div className="flex items-center gap-2 w-full md:w-1/2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={newChargeQty}
                      onChange={(e) => setNewChargeQty(e.target.value)}
                      className="h-10 sm:h-11 bg-white text-center w-20 shrink-0 md:w-[40%]"
                    />
                    <Input
                      type="number"
                      placeholder="Rate (₹)"
                      value={newChargeRate}
                      onChange={(e) => setNewChargeRate(e.target.value)}
                      className="h-10 sm:h-11 bg-white text-right flex-1 md:w-[40%]"
                    />
                    <Button
                      onClick={handleAddAdditionalCharge}
                      disabled={
                        !newChargeName.trim() ||
                        !newChargeRate ||
                        isAddingCharge
                      }
                      className="h-10 sm:h-11 bg-slate-800 hover:bg-slate-900 text-white px-4 shrink-0 rounded-xl md:w-[20%]"
                    >
                      {isAddingCharge ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
                  {/* Mobile View: Clean Additional Charge Cards */}
                  <div className="divide-y divide-slate-100 sm:hidden">
                    {booking.additional_charges.map((charge) => (
                      <div key={charge.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition-colors">
                        {editingChargeId === charge.id ? (
                          <div className="space-y-2">
                            <Input
                              placeholder="Charge Name"
                              value={editChargeName}
                              onChange={(e) => setEditChargeName(e.target.value)}
                              className="h-9 text-xs bg-white"
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Qty"
                                value={editChargeQty}
                                onChange={(e) => setEditChargeQty(e.target.value)}
                                className="h-9 text-xs text-center w-20 shrink-0 bg-white"
                              />
                              <Input
                                type="number"
                                placeholder="Rate"
                                value={editChargeRate}
                                onChange={(e) => setEditChargeRate(e.target.value)}
                                className="h-9 text-xs text-right flex-1 bg-white"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-emerald-50 shrink-0"
                                onClick={handleUpdateAdditionalCharge}
                                disabled={isUpdatingCharge}
                              >
                                {isUpdatingCharge ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Check className="size-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-3 text-slate-600 border-slate-200 hover:bg-slate-100 shrink-0"
                                onClick={() => setEditingChargeId(null)}
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-semibold text-slate-900 text-sm leading-snug">
                                {charge.charge_name}
                              </h4>
                              <span className="font-extrabold text-[#7c3aed] text-sm shrink-0">
                                ₹{(Number(charge.rate) * charge.quantity).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-medium">
                              <div className="flex items-center gap-2">
                                <span>
                                  Qty: <strong className="text-slate-700 font-semibold">{charge.quantity}</strong>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span>
                                  Rate: <strong className="text-slate-700 font-semibold">₹{Number(charge.rate).toLocaleString()}</strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 rounded-lg text-slate-400 hover:text-[#7c3aed] hover:bg-purple-50"
                                  onClick={() => {
                                    setEditingChargeId(charge.id);
                                    setEditChargeName(charge.charge_name);
                                    setEditChargeQty(String(charge.quantity));
                                    setEditChargeRate(String(charge.rate));
                                  }}
                                >
                                  <Edit className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleDeleteAdditionalCharge(charge.id)}
                                  disabled={deletingChargeId === charge.id}
                                >
                                  {deletingChargeId === charge.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Trash className="size-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {booking.additional_charges.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No additional charges added.
                      </div>
                    )}
                  </div>

                  {/* Desktop View: Full Data Table with Proportional Widths */}
                  <table className="w-full text-sm text-left hidden sm:table">
                    <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-[45%]">Additional Item</th>
                        <th className="px-4 py-3 font-semibold text-center w-[15%]">Qty</th>
                        <th className="px-4 py-3 font-semibold text-right w-[15%]">Rate</th>
                        <th className="px-4 py-3 font-semibold text-right w-[15%]">Total</th>
                        <th className="px-4 py-3 font-semibold text-center w-[10%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {booking.additional_charges.map((charge) => (
                        <tr key={charge.id} className="hover:bg-slate-50/50 transition-colors">
                          {editingChargeId === charge.id ? (
                            <>
                              <td className="px-4 py-2">
                                <Input
                                  value={editChargeName}
                                  onChange={(e) => setEditChargeName(e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  value={editChargeQty}
                                  onChange={(e) => setEditChargeQty(e.target.value)}
                                  className="h-8 text-sm text-center"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  value={editChargeRate}
                                  onChange={(e) => setEditChargeRate(e.target.value)}
                                  className="h-8 text-sm text-right"
                                />
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                ₹{(Number(editChargeRate) * Number(editChargeQty)).toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="size-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    onClick={handleUpdateAdditionalCharge}
                                    disabled={isUpdatingCharge}
                                  >
                                    {isUpdatingCharge ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <Check className="size-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="size-7 text-slate-600 border-slate-200 hover:bg-slate-100"
                                    onClick={() => setEditingChargeId(null)}
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3.5 font-medium text-slate-900">
                                {charge.charge_name}
                              </td>
                              <td className="px-4 py-3.5 text-center font-medium text-slate-700">
                                {charge.quantity}
                              </td>
                              <td className="px-4 py-3.5 text-right text-slate-600">
                                ₹{Number(charge.rate).toLocaleString()}
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                                ₹{(Number(charge.rate) * charge.quantity).toLocaleString()}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-7 rounded-lg text-slate-400 hover:text-[#7c3aed] hover:bg-purple-50"
                                    onClick={() => {
                                      setEditingChargeId(charge.id);
                                      setEditChargeName(charge.charge_name);
                                      setEditChargeQty(String(charge.quantity));
                                      setEditChargeRate(String(charge.rate));
                                    }}
                                  >
                                    <Edit className="size-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    onClick={() => handleDeleteAdditionalCharge(charge.id)}
                                    disabled={deletingChargeId === charge.id}
                                  >
                                    {deletingChargeId === charge.id ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <Trash className="size-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {booking.additional_charges.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No additional charges added.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quotation Summary Card */}
          <Card className="rounded-[1.75rem] border-slate-100 shadow-md shadow-purple-950/5 mt-6 bg-purple-50/30">
            <CardContent className="p-6">
              <div className="max-w-sm ml-auto space-y-3">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    ₹{subTotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Discount (₹)</span>
                  {isEditingDiscount ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={tempDiscount}
                        onChange={(e) => setTempDiscount(e.target.value)}
                        className="h-8 w-24 text-right bg-white"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-emerald-600 hover:bg-emerald-100"
                        onClick={handleUpdateDiscount}
                        disabled={isUpdatingDiscount}
                      >
                        {isUpdatingDiscount ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-slate-400 hover:bg-slate-100"
                        onClick={() => setIsEditingDiscount(false)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => {
                        setTempDiscount(String(booking.discount));
                        setIsEditingDiscount(true);
                      }}
                    >
                      <span className="font-medium text-rose-600">
                        -₹{Number(booking.discount).toLocaleString()}
                      </span>
                      <Edit className="size-3.5 text-slate-400 group-hover:text-[#7c3aed] transition-colors" />
                    </div>
                  )}
                </div>

                <Separator className="bg-purple-200" />

                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-slate-800 text-lg">
                    Grand Total
                  </span>
                  <span className="text-2xl font-bold text-[#7c3aed]">
                    ₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. PAYMENTS TAB */}
        <TabsContent
          value="payments"
          className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="grid gap-6 md:grid-cols-[1fr_350px]">
            <Card className="rounded-[1.75rem] border-slate-100 shadow-md shadow-purple-950/5 h-fit">
              <CardHeader className="flex flex-row items-center justify-between !p-4 border-b">
                <div>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                </div>
                <Button
                  onClick={() => setPaymentOpen(true)}
                  size="sm"
                  className="rounded-xl h-9 px-2.5 sm:px-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-600/20 font-semibold"
                  title="Add Payment"
                >
                  <Plus className="size-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add Payment</span>
                </Button>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4">
                <div className="space-y-3">
                  {payments.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      No payments recorded yet.
                    </div>
                  )}
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200/80 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 sm:size-11 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                          <CheckCircle2 className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                              {payment.payment_type} Payment
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-extrabold text-[#7c3aed] border-purple-200 bg-purple-50 uppercase tracking-wider px-2 py-0.2 shrink-0"
                            >
                              Paid
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate">
                            <span>via <strong className="text-slate-700">{payment.payment_method}</strong></span>
                            <span>•</span>
                            <span>{new Date(payment.payment_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                          </p>
                          {payment.remark && (
                            <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">
                              "{payment.remark}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-0 border-slate-200/60">
                        <span className="text-base sm:text-lg font-black text-[#7c3aed] tracking-tight">
                          +₹{Number(payment.amount).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 hover:bg-[#7c3aed] hover:text-white transition-all"
                            onClick={() => {
                              setEditingPayment(payment);
                              setEditPaymentType(payment.payment_type);
                              setEditPaymentMethod(payment.payment_method);
                              setEditPaymentAmount(String(payment.amount));
                              setEditPaymentDate(payment.payment_date);
                              setEditPaymentRemark(payment.remark ?? "");
                              setEditPaymentOpen(true);
                            }}
                            title="Edit Payment"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"
                            onClick={async () => {
                              setDeletingPaymentId(payment.id);
                              try {
                                const res = await fetch(
                                  `/api/bookings/${bookingId}/payments?paymentId=${payment.id}`,
                                  { method: "DELETE" }
                                );
                                if (res.ok)
                                  setPayments((prev) =>
                                    prev.filter((p) => p.id !== payment.id)
                                  );
                              } finally {
                                setDeletingPaymentId(null);
                              }
                            }}
                            disabled={deletingPaymentId === payment.id}
                            title="Delete Payment"
                          >
                            {deletingPaymentId === payment.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div>
              {/* Single Unified Financial Overview Card */}
              <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] overflow-hidden">
                {/* Header */}
                <CardHeader className="!p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                      <Wallet className="size-4 text-[#7c3aed]" />
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Financial Overview
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 border ${
                      dueAmount <= 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {dueAmount <= 0 ? "Fully Settled" : "Balance Due"}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Highlighted Balance Box (Red when due > 0, Green when settled) */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      dueAmount > 0
                        ? "bg-rose-50/80 border-rose-100"
                        : "bg-emerald-50/80 border-emerald-100"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider block mb-0.5 ${
                        dueAmount > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {dueAmount > 0 ? "Remaining Balance Due" : "All Settled"}
                    </span>
                    <h2
                      className={`text-2xl sm:text-3xl font-black tracking-tight ${
                        dueAmount > 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      ₹{dueAmount.toLocaleString()}
                    </h2>
                  </div>

                  {/* Key Metrics Breakdown List */}
                  {/* <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Total Billed</span>
                      <span className="font-bold text-slate-900">₹{grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Total Received</span>
                      <span className="font-extrabold text-emerald-600">₹{totalPaid.toLocaleString()}</span>
                    </div>
                  </div> */}

                  {/* 3-Column Vertical Bar Comparison Graph */}
                  <div className="pt-1 pb-1 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Financial Comparison</span>
                      <span className="text-[#7c3aed] font-extrabold">
                        {Math.round(paidPercentage)}% Collected
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                      {/* Vertical Bars Container */}
                      <div className="flex items-end justify-between gap-3 h-30 pt-4 px-2">
                        {/* 1. Total Billed Bar */}
                        <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[12px] font-extrabold text-slate-700 leading-none">
                            ₹{grandTotal.toLocaleString()}
                          </span>
                          <div className="w-full h-full bg-slate-200/80 rounded-t-xl flex items-end overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-t from-slate-300 to-slate-400 rounded-t-xl" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Billed
                          </span>
                        </div>

                        {/* 2. Received Bar */}
                        <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[12px] font-extrabold text-[#7c3aed] leading-none">
                            ₹{totalPaid.toLocaleString()}
                          </span>
                          <div className="w-full h-full bg-purple-100/60 rounded-t-xl flex items-end overflow-hidden">
                            <div
                              className="w-full bg-gradient-to-t from-purple-600 to-indigo-600 rounded-t-xl transition-all duration-500"
                              style={{
                                height: `${Math.min(100, Math.max(12, paidPercentage))}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                            Received
                          </span>
                        </div>

                        {/* 3. Due Bar */}
                        <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[12px] font-extrabold text-rose-600 leading-none">
                            ₹{dueAmount.toLocaleString()}
                          </span>
                          <div className="w-full h-full bg-rose-100/60 rounded-t-xl flex items-end overflow-hidden">
                            <div
                              className="w-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-xl transition-all duration-500"
                              style={{
                                height: `${Math.min(
                                  100,
                                  Math.max(12, 100 - paidPercentage),
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                            Due
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Send WhatsApp Reminder Action Button */}
                  <a
                    href={`https://wa.me/${booking.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Hi ${booking.customer.customer_name},\n\nThis is a friendly payment reminder regarding your booking for ${new Date(booking.booking_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}.\n\n*Payment Summary:*\n• Total Billed: ₹${grandTotal.toLocaleString()}\n• Total Received: ₹${totalPaid.toLocaleString()}\n• *Remaining Balance Due: ₹${dueAmount.toLocaleString()}*\n\nPlease let us know once paid. Thank you!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold h-10 shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2 text-sm"
                  >
                    <MessageCircle className="size-4" /> Send WhatsApp Reminder
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 3. EXPENSES TAB */}
        <TabsContent
          value="expenses"
          className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="grid gap-6 md:grid-cols-[1fr_350px]">
            {/* 1. Logged Expenses */}
            <Card className="rounded-[1.75rem] border-slate-100 shadow-md shadow-purple-950/5 h-fit">
              <CardHeader className="flex flex-row items-center justify-between !p-4 border-b">
                <div>
                  <CardTitle className="text-lg">Logged Expenses</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCustomExpenseModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 px-2.5 sm:px-3 text-[#7c3aed] border-purple-200 hover:bg-purple-50 font-semibold"
                    title="Custom Expenses"
                  >
                    <FolderPlus className="size-4 text-[#7c3aed] sm:mr-1.5" />
                    <span className="hidden sm:inline">Custom Expenses</span>
                  </Button>
                  <Button
                    onClick={() => setExpenseOpen(true)}
                    size="sm"
                    className="rounded-xl h-9 px-2.5 sm:px-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-600/20 font-semibold"
                    title="Add Expense"
                  >
                    <Plus className="size-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Add Expense</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4">
                <div className="space-y-3">
                  {expenses.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      No expenses logged yet.
                    </div>
                  )}
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200/80 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-10 sm:size-11 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                          <TrendingDown className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                            {expense.expense_name}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate">
                            <span>{new Date(expense.expense_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                            {expense.description && (
                              <>
                                <span>•</span>
                                <span className="truncate">{expense.description}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-0 border-slate-200/60">
                        <span className="text-base sm:text-lg font-black text-[#7c3aed] tracking-tight">
                          -₹{Number(expense.amount).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 hover:bg-[#7c3aed] hover:text-white transition-all"
                            onClick={() => {
                              setEditingExpense(expense);
                              setEditExpenseName(expense.expense_name);
                              setEditExpenseAmount(String(expense.amount));
                              setEditExpenseDate(expense.expense_date);
                              setEditExpenseDescription(
                                expense.description ?? "",
                              );
                              setEditExpenseOpen(true);
                            }}
                            title="Edit Expense"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"
                            onClick={async () => {
                              setDeletingExpenseId(expense.id);
                              try {
                                const res = await fetch(
                                  `/api/bookings/${bookingId}/expenses?expenseId=${expense.id}`,
                                  { method: "DELETE" },
                                );
                                if (res.ok)
                                  setExpenses((prev) =>
                                    prev.filter((e) => e.id !== expense.id),
                                  );
                              } finally {
                                setDeletingExpenseId(null);
                              }
                            }}
                            disabled={deletingExpenseId === expense.id}
                            title="Delete Expense"
                          >
                            {deletingExpenseId === expense.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 2. Profitability Overview Card */}
            <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] overflow-hidden h-fit">
              {/* Header */}
              <CardHeader className="!p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <TrendingUp className="size-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Profitability Overview
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 border ${
                    netProfit >= 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {netProfit >= 0 ? "Profitable" : "Loss"}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Highlighted Net Profit Box */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    netProfit >= 0
                      ? "bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-teal-50/30 border-emerald-100"
                      : "bg-gradient-to-br from-rose-50/80 via-rose-50/40 to-amber-50/30 border-rose-100"
                  }`}
                >
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider block mb-0.5 ${
                      netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {netProfit >= 0 ? "Estimated Net Profit" : "Net Loss"}
                  </span>
                  <h2
                    className={`text-2xl sm:text-3xl font-black tracking-tight ${
                      netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    ₹{netProfit.toLocaleString()}
                  </h2>
                </div>

                {/* Metrics Breakdown List */}
                {/* <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <DollarSign className="size-3.5 text-slate-400" /> Total Revenue
                    </span>
                    <span className="font-bold text-slate-900">₹{grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <TrendingDown className="size-3.5 text-rose-500" /> Total Expenses
                    </span>
                    <span className="font-bold text-rose-600">-₹{totalExpenses.toLocaleString()}</span>
                  </div>
                </div> */}

                {/* Revenue vs Expense Vertical Bar Comparison Graph */}
                <div className="pt-1 pb-1 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Revenue vs Expense Ratio</span>
                    <span className="text-[#7c3aed] font-extrabold">
                      {profitMargin}% Margin
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                    {/* Vertical Bars Container */}
                    <div className="flex items-end justify-around gap-4 h-30 pt-4 px-3">
                      {/* 1. Total Revenue Bar */}
                      <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end max-w-[100px]">
                        <span className="text-[12px] font-extrabold text-[#7c3aed] leading-none">
                          ₹{grandTotal.toLocaleString()}
                        </span>
                        <div className="w-full h-full bg-purple-100/60 rounded-t-xl flex items-end overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-t from-purple-600 to-indigo-600 rounded-t-xl transition-all duration-500" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                          Revenue
                        </span>
                      </div>

                      {/* 2. Total Expenses Bar */}
                      <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end max-w-[100px]">
                        <span className="text-[12px] font-extrabold text-rose-600 leading-none">
                          ₹{totalExpenses.toLocaleString()}
                        </span>
                        <div className="w-full h-full bg-rose-100/60 rounded-t-xl flex items-end overflow-hidden">
                          <div
                            className="w-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-xl transition-all duration-500"
                            style={{
                              height: `${
                                grandTotal > 0
                                  ? Math.min(
                                      100,
                                      Math.max(12, (totalExpenses / grandTotal) * 100),
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                          Expenses
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. PORTFOLIO TAB */}
        <TabsContent
          value="portfolio"
          className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <BookingPortfolioTab bookingId={Number(bookingId)} />
        </TabsContent>
      </Tabs>

      <AppModal
        open={updateOpen}
        icon={<Send className="size-5" />}
        onClose={() => setUpdateOpen(false)}
        title="Send Update to Client"
        description="Choose what you want to send to Priyanka Sharma."
        footer={
          !updateSent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <Button
                variant="outline"
                className="w-full h-11 rounded-2xl gap-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                onClick={() => handleSendUpdate("whatsapp")}
              >
                <MessageCircle className="size-4" />
                Send via WhatsApp
              </Button>
              <Button
                className="w-full h-11 rounded-2xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] gap-2"
                onClick={() => handleSendUpdate("email")}
              >
                <Send className="size-4" />
                Send via Email
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setUpdateOpen(false)}
            >
              Close
            </Button>
          )
        }
      >
        {!updateSent ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setUpdateType("quotation")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-start gap-3 ${updateType === "quotation" ? "border-[#7c3aed] bg-purple-50/50" : "border-slate-100 hover:border-purple-200"}`}
              >
                <div
                  className={`p-2 rounded-xl ${updateType === "quotation" ? "bg-[#7c3aed] text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  <FileText className="size-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">
                    Quotation
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Send a PDF link of the detailed quote.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setUpdateType("reminder")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-start gap-3 ${updateType === "reminder" ? "border-[#7c3aed] bg-purple-50/50" : "border-slate-100 hover:border-purple-200"}`}
              >
                <div
                  className={`p-2 rounded-xl ${updateType === "reminder" ? "bg-[#7c3aed] text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  <Wallet className="size-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">
                    Payment Reminder
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Remind client of pending ₹{dueAmount.toLocaleString()}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-inner">
              <Check className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Update Sent!</h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              The client has been successfully notified.
            </p>
          </div>
        )}
      </AppModal>

      {/* Add Payment Modal */}
      <AppModal
        open={paymentOpen}
        icon={<CreditCard className="size-5" />}
        onClose={() => setPaymentOpen(false)}
        title="Add Payment"
        description={`Record a new payment for Booking #${booking?.user_booking_index ?? booking?.id ?? "…"}.`}
        footer={
          !paymentSuccess ? (
            <>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                onClick={() => setPaymentOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 text-white"
                disabled={
                  !paymentAmount ||
                  Number(paymentAmount) <= 0 ||
                  Number(paymentAmount) > dueAmount ||
                  isSavingPayment
                }
                onClick={async () => {
                  setIsSavingPayment(true);
                  try {
                    const res = await fetch(
                      `/api/bookings/${bookingId}/payments`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          payment_type: paymentType,
                          payment_method: paymentMethod,
                          amount: Number(paymentAmount),
                          payment_date: paymentDate,
                          remark: paymentRemark,
                        }),
                      },
                    );
                    const data = await res.json();
                    if (data.payment) {
                      setPayments((prev) => [data.payment, ...prev]);
                      setPaymentSuccess(true);
                      setTimeout(() => {
                        setPaymentOpen(false);
                        setTimeout(() => {
                          setPaymentSuccess(false);
                          setPaymentAmount("");
                          setPaymentRemark("");
                        }, 500);
                      }, 2000);
                    }
                  } finally {
                    setIsSavingPayment(false);
                  }
                }}
              >
                {isSavingPayment ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Save Payment
              </Button>
            </>
          ) : null
        }
      >
        {!paymentSuccess ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FloatingDropdown
                label="Payment Type"
                value={paymentType}
                hasValue={true}
              >
                <DropdownMenuRadioGroup
                  value={paymentType}
                  onValueChange={setPaymentType}
                >
                  <DropdownMenuRadioItem value="Advance" className="rounded-xl">
                    Advance
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="Installment"
                    className="rounded-xl"
                  >
                    Installment
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="Final Payment"
                    className="rounded-xl"
                  >
                    Final Payment
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </FloatingDropdown>

              <FloatingDropdown
                label="Method"
                value={paymentMethod}
                hasValue={true}
              >
                <DropdownMenuRadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <DropdownMenuRadioItem value="UPI" className="rounded-xl">
                    UPI
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Cash" className="rounded-xl">
                    Cash
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Check" className="rounded-xl">
                    Check
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="Bank Transfer"
                    className="rounded-xl"
                  >
                    Bank Transfer
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </FloatingDropdown>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FloatingInput
                  label="Amount (₹)"
                  type="number"
                  min="1"
                  max={dueAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                {Number(paymentAmount) > dueAmount && (
                  <p className="text-xs text-rose-500 mt-1">
                    Amount cannot exceed due: ₹{dueAmount.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Date
                </Label>
                <DatePicker
                  value={paymentDate}
                  onChange={setPaymentDate}
                  className="bg-white"
                />
              </div>
            </div>

            <FloatingTextarea
              label="Remark (Optional)"
              value={paymentRemark}
              onChange={(e) => setPaymentRemark(e.target.value)}
              className="h-20"
            />
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-inner">
              <Check className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              Payment Logged!
            </h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              ₹{Number(paymentAmount).toLocaleString()} was successfully added
              to this booking.
            </p>
          </div>
        )}
      </AppModal>

      {/* Add Expense Modal */}
      <AppModal
        open={expenseOpen}
        icon={<TrendingDown className="size-5" />}
        onClose={() => setExpenseOpen(false)}
        title="Add Expense"
        description={`Log a new expense for Booking #${booking?.user_booking_index ?? booking?.id ?? "…"}.`}
        footer={
          !expenseSuccess ? (
            <>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                onClick={() => setExpenseOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="h-11 rounded-2xl bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 text-white"
                disabled={
                  !expenseName ||
                  !expenseAmount ||
                  Number(expenseAmount) <= 0 ||
                  isSavingExpense
                }
                onClick={async () => {
                  setIsSavingExpense(true);
                  try {
                    const res = await fetch(
                      `/api/bookings/${bookingId}/expenses`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          expense_name: expenseName,
                          amount: Number(expenseAmount),
                          expense_date: expenseDate,
                          description: expenseDescription,
                        }),
                      },
                    );
                    const data = await res.json();
                    if (data.expense) {
                      setExpenses((prev) => [data.expense, ...prev]);
                      setExpenseSuccess(true);
                      setTimeout(() => {
                        setExpenseOpen(false);
                        setTimeout(() => {
                          setExpenseSuccess(false);
                          setExpenseAmount("");
                          setExpenseDescription("");
                          setExpenseName("");
                        }, 500);
                      }, 2000);
                    }
                  } finally {
                    setIsSavingExpense(false);
                  }
                }}
              >
                {isSavingExpense ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Log Expense
              </Button>
            </>
          ) : null
        }
      >
        {!expenseSuccess ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FloatingDropdown label="Expense Category" value={expenseName}>
                  <DropdownMenuRadioGroup
                    value={expenseName}
                    onValueChange={setExpenseName}
                  >
                    {customExpenses.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-slate-500">
                        No categories added
                      </div>
                    ) : (
                      customExpenses.map((cat) => (
                        <DropdownMenuRadioItem
                          key={cat.id}
                          value={cat.name}
                          className="rounded-xl"
                        >
                          {cat.name}
                        </DropdownMenuRadioItem>
                      ))
                    )}
                  </DropdownMenuRadioGroup>
                </FloatingDropdown>
                {customExpenses.length === 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Add categories in the Custom Expenses card first.
                  </p>
                )}
              </div>

              <FloatingInput
                label="Amount (₹)"
                type="number"
                min="1"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>

            <DatePicker
              value={expenseDate}
              onChange={setExpenseDate}
              className="bg-white"
            />

            <FloatingTextarea
              label="Description (optional)"
              value={expenseDescription}
              onChange={(e) => setExpenseDescription(e.target.value)}
              className="h-20"
            />
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div className="size-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-inner">
              <Check className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              Expense Logged!
            </h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              ₹{Number(expenseAmount).toLocaleString()} was successfully added
              to this booking's expenses.
            </p>
          </div>
        )}
      </AppModal>

      {/* Edit Payment Modal */}
      <AppModal
        open={editPaymentOpen}
        icon={<CreditCard className="size-5" />}
        onClose={() => {
          setEditPaymentOpen(false);
          setEditingPayment(null);
        }}
        title="Edit Payment"
        description={
          editingPayment
            ? `Editing ${editingPayment.payment_type} payment of ₹${Number(editingPayment.amount).toLocaleString()}`
            : ""
        }
        footer={
          <>
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={() => {
                setEditPaymentOpen(false);
                setEditingPayment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 text-white"
              disabled={
                !editPaymentAmount ||
                Number(editPaymentAmount) <= 0 ||
                isSavingPayment
              }
              onClick={async () => {
                if (!editingPayment) return;
                setIsSavingPayment(true);
                try {
                  const res = await fetch(
                    `/api/bookings/${bookingId}/payments`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        paymentId: editingPayment.id,
                        payment_type: editPaymentType,
                        payment_method: editPaymentMethod,
                        amount: Number(editPaymentAmount),
                        payment_date: editPaymentDate,
                        remark: editPaymentRemark,
                      }),
                    },
                  );
                  const data = await res.json();
                  if (data.payment) {
                    setPayments((prev) =>
                      prev.map((p) =>
                        p.id === data.payment.id ? data.payment : p,
                      ),
                    );
                    setEditPaymentOpen(false);
                    setEditingPayment(null);
                  }
                } finally {
                  setIsSavingPayment(false);
                }
              }}
            >
              {isSavingPayment ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FloatingDropdown
              label="Payment Type"
              value={editPaymentType}
              hasValue={true}
            >
              <DropdownMenuRadioGroup
                value={editPaymentType}
                onValueChange={setEditPaymentType}
              >
                {["Advance", "Installment", "Final Payment"].map((t) => (
                  <DropdownMenuRadioItem
                    key={t}
                    value={t}
                    className="rounded-xl"
                  >
                    {t}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </FloatingDropdown>
            <FloatingDropdown
              label="Payment Method"
              value={editPaymentMethod}
              hasValue={true}
            >
              <DropdownMenuRadioGroup
                value={editPaymentMethod}
                onValueChange={setEditPaymentMethod}
              >
                {["UPI", "Cash", "Check", "Bank Transfer"].map((m) => (
                  <DropdownMenuRadioItem
                    key={m}
                    value={m}
                    className="rounded-xl"
                  >
                    {m}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </FloatingDropdown>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FloatingInput
              label="Amount (₹)"
              type="number"
              value={editPaymentAmount}
              onChange={(e) => setEditPaymentAmount(e.target.value)}
            />
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Payment Date
              </Label>
              <DatePicker
                value={editPaymentDate}
                onChange={setEditPaymentDate}
              />
            </div>
          </div>
          <FloatingTextarea
            label="Remark (Optional)"
            value={editPaymentRemark}
            onChange={(e) => setEditPaymentRemark(e.target.value)}
            className="h-20"
          />
        </div>
      </AppModal>

      {/* Edit Expense Modal */}
      <AppModal
        open={editExpenseOpen}
        icon={<TrendingDown className="size-5" />}
        onClose={() => {
          setEditExpenseOpen(false);
          setEditingExpense(null);
        }}
        title="Edit Expense"
        description={
          editingExpense ? `Editing "${editingExpense.expense_name}"` : ""
        }
        footer={
          <>
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={() => {
                setEditExpenseOpen(false);
                setEditingExpense(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-2xl bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 text-white"
              disabled={
                !editExpenseName.trim() ||
                !editExpenseAmount ||
                Number(editExpenseAmount) <= 0 ||
                isSavingExpense
              }
              onClick={async () => {
                if (!editingExpense) return;
                setIsSavingExpense(true);
                try {
                  const res = await fetch(
                    `/api/bookings/${bookingId}/expenses`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        expenseId: editingExpense.id,
                        expense_name: editExpenseName,
                        amount: Number(editExpenseAmount),
                        expense_date: editExpenseDate,
                        description: editExpenseDescription,
                      }),
                    },
                  );
                  const data = await res.json();
                  if (data.expense) {
                    setExpenses((prev) =>
                      prev.map((e) =>
                        e.id === data.expense.id ? data.expense : e,
                      ),
                    );
                    setEditExpenseOpen(false);
                    setEditingExpense(null);
                  }
                } finally {
                  setIsSavingExpense(false);
                }
              }}
            >
              {isSavingExpense ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FloatingInput
            label="Expense Name"
            value={editExpenseName}
            onChange={(e) => setEditExpenseName(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FloatingInput
              label="Amount (₹)"
              type="number"
              value={editExpenseAmount}
              onChange={(e) => setEditExpenseAmount(e.target.value)}
            />
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Date
              </Label>
              <DatePicker
                value={editExpenseDate}
                onChange={setEditExpenseDate}
              />
            </div>
          </div>
          <FloatingTextarea
            label="Description (Optional)"
            value={editExpenseDescription}
            onChange={(e) => setEditExpenseDescription(e.target.value)}
            className="h-20"
          />
        </div>
      </AppModal>

      {/* Edit Services Modal */}
      <AppModal
        open={editServicesOpen}
        icon={<FileText className="size-5" />}
        onClose={() => setEditServicesOpen(false)}
        title="Edit Services"
        description="Modify quantities, prices, or add new services to this booking."
        footer={
          <>
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={() => setEditServicesOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] shadow-md shadow-purple-500/20 text-white"
              disabled={isSavingServices}
              onClick={async () => {
                setIsSavingServices(true);
                try {
                  const res = await fetch(
                    `/api/bookings/${bookingId}/services`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        services: editingServices.map((s) => ({
                          service_id: s.id,
                          quantity: Number(s.quantity) || 1,
                          unit_price: Number(s.price) || 0,
                        })),
                      }),
                    },
                  );
                  if (res.ok) {
                    setBooking({ ...booking!, services: [...editingServices] });
                    setEditServicesOpen(false);
                  }
                } finally {
                  setIsSavingServices(false);
                }
              }}
            >
              {isSavingServices ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save Services
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm text-left block sm:table">
              <thead className="bg-slate-50 text-slate-500 hidden sm:table-header-group">
                <tr>
                  <th className="px-4 py-3 font-medium">Service Name</th>
                  <th className="px-4 py-3 font-medium text-center w-24">
                    Qty
                  </th>
                  <th className="px-4 py-3 font-medium text-right w-32">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 font-medium text-right w-32">
                    Total
                  </th>
                  <th className="px-4 py-3 font-medium text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 block sm:table-row-group">
                {editingServices.map((service, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 transition-colors block sm:table-row relative p-4 sm:p-0"
                  >
                    <td className="sm:px-4 sm:py-3 font-medium text-slate-800 block sm:table-cell mb-3 sm:mb-0 pr-10 sm:pr-4">
                      {service.service_name}
                    </td>
                    <td className="sm:px-4 sm:py-2 block sm:table-cell">
                      <span className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">
                        Qty
                      </span>
                      <Input
                        type="number"
                        min="1"
                        value={service.quantity}
                        onChange={(e) => {
                          const newServices = [...editingServices];
                          newServices[idx].quantity = Number(e.target.value);
                          setEditingServices(newServices);
                        }}
                        className="h-9 sm:w-full text-center"
                      />
                    </td>
                    <td className="sm:px-4 sm:py-2 block sm:table-cell mt-2 sm:mt-0">
                      <span className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">
                        Unit Price (₹)
                      </span>
                      <Input
                        type="number"
                        min="0"
                        value={service.price}
                        onChange={(e) => {
                          const newServices = [...editingServices];
                          newServices[idx].price = Number(e.target.value);
                          setEditingServices(newServices);
                        }}
                        className="h-9 sm:w-full text-right"
                      />
                    </td>
                    <td className="sm:px-4 sm:py-3 text-right font-semibold text-slate-800 block sm:table-cell pt-3 sm:pt-3">
                      <span className="sm:hidden font-medium text-slate-500 mr-2">
                        Total:
                      </span>
                      ₹{(service.price * service.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center absolute sm:relative top-2 sm:top-auto right-2 sm:right-auto block sm:table-cell">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 sm:size-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          const newServices = [...editingServices];
                          newServices.splice(idx, 1);
                          setEditingServices(newServices);
                        }}
                      >
                        <Trash className="size-4 sm:size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {editingServices.length === 0 && (
                  <tr className="block sm:table-row">
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500 block sm:table-cell"
                    >
                      No services added to this booking yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="w-full sm:w-2/3 space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Add a Service
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm hover:bg-slate-50 transition-colors">
                  <span className="text-slate-500">
                    Select a service to add...
                  </span>
                  <ChevronDown className="size-4 text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full max-w-[300px] rounded-2xl max-h-60 overflow-y-auto">
                  {availableServices
                    .filter(
                      (s) => !editingServices.some((es) => es.id === s.id),
                    )
                    .map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        className="rounded-xl cursor-pointer"
                        onClick={() => {
                          setEditingServices([
                            ...editingServices,
                            { ...s, quantity: 1 },
                          ]);
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{s.service_name}</span>
                          <span className="text-slate-500 text-xs">
                            ₹{s.price.toLocaleString()}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  {availableServices.filter(
                    (s) => !editingServices.some((es) => es.id === s.id),
                  ).length === 0 && (
                    <div className="p-3 text-sm text-slate-500 text-center">
                      No more services available
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                New Total
              </p>
              <p className="text-2xl font-bold text-[#7c3aed]">
                ₹
                {editingServices
                  .reduce((acc, s) => acc + s.price * s.quantity, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </AppModal>

      {/* Custom Expense Categories Modal */}
      <AppModal
        open={customExpenseModalOpen}
        icon={<FolderPlus className="size-5 text-[#7c3aed]" />}
        onClose={() => setCustomExpenseModalOpen(false)}
        title="Custom Expenses"
        description="Add, edit, or track custom expense categories."
      >
        <div className="space-y-4 pt-1">
          <div className="flex gap-2">
            <Input
              placeholder="Expense category name..."
              value={newCustomExpense}
              onChange={(e) => setNewCustomExpense(e.target.value)}
              className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm"
              onKeyDown={(e) =>
                e.key === "Enter" && handleAddCustomExpense()
              }
            />
            <Button
              size="sm"
              onClick={handleAddCustomExpense}
              disabled={!newCustomExpense.trim() || isAddingCustomExpense}
              className="rounded-xl h-10 bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-sm font-semibold px-4 shrink-0"
            >
              {isAddingCustomExpense ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Add Category"
              )}
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {customExpenses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No custom expense categories added yet.
              </div>
            ) : (
              customExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-purple-100 transition-colors gap-2"
                >
                  {editingCustomExpenseId === expense.id ? (
                    <div className="flex w-full items-center gap-2">
                      <Input
                        value={editingCustomExpenseName}
                        onChange={(e) =>
                          setEditingCustomExpenseName(e.target.value)
                        }
                        className="h-9 text-sm rounded-lg border-purple-200"
                        autoFocus
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleUpdateCustomExpense()
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-lg text-emerald-600 hover:bg-emerald-50 shrink-0"
                        onClick={handleUpdateCustomExpense}
                        disabled={isUpdatingCustomExpense}
                      >
                        {isUpdatingCustomExpense ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-lg text-slate-400 hover:bg-slate-50 shrink-0"
                        onClick={() => setEditingCustomExpenseId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-slate-800 break-words flex-1">
                        {expense.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 hover:bg-[#7c3aed] hover:text-white transition-all"
                          onClick={() => {
                            setEditingCustomExpenseId(expense.id);
                            setEditingCustomExpenseName(expense.name);
                          }}
                          title="Edit Category"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"
                          onClick={() =>
                            handleDeleteCustomExpense(expense.id)
                          }
                          disabled={
                            deletingCustomExpenseId === expense.id
                          }
                          title="Delete Category"
                        >
                          {deletingCustomExpenseId === expense.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </AppModal>
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, HardDrive, LayoutGrid, List, Loader2, Search, Sparkles } from "lucide-react";

import { HeaderPortal, PageHeader } from "@/components/common/dashboard/dashboard-header-context";
import { AppModal } from "@/components/common/shared/app-modal";
import { FloatingInput } from "@/components/common/shared/floating-input";
import { PortfolioFolderGrid } from "@/components/portfolio/portfolio-folder-grid";
import { PortfolioShareModal } from "@/components/portfolio/portfolio-share-modal";
import { StorageMeter } from "@/components/storage/storage-meter";
import { StoragePlansModal } from "@/components/storage/storage-plans-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  PortfolioFolderWithStats,
  QuotaInfo,
  StoragePlanRow,
} from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const [folders, setFolders] = useState<PortfolioFolderWithStats[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [plans, setPlans] = useState<StoragePlanRow[]>([]);
  const [gstRate, setGstRate] = useState<number>(0.18);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [shareFolder, setShareFolder] =
    useState<PortfolioFolderWithStats | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, storageRes] = await Promise.all([
        fetch(
          `/api/portfolio/folders${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        ),
        fetch("/api/portfolio/storage-info"),
      ]);
      const foldersJson = await foldersRes.json();
      const storageJson = await storageRes.json();

      if (foldersJson.status) setFolders(foldersJson.data.folders);
      if (storageJson.status) {
        setQuota(storageJson.data.quota);
        setPlans(storageJson.data.plans ?? []);
        if (storageJson.data.gstRate !== undefined) {
          setGstRate(storageJson.data.gstRate);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/portfolio/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      const json = await res.json();
      if (!json.status) throw new Error(json.message);
      setCreateOpen(false);
      setNewFolderName("");
      void loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteFolder(id: number) {
    if (!confirm("Delete this folder and all its files?")) return;
    await fetch(`/api/portfolio/folders/${id}`, { method: "DELETE" });
    void loadData();
  }

  return (
    <>
      <PageHeader title="Portfolio" />
      <HeaderPortal
        search={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#858aa5]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders…"
              className="h-10 sm:h-11 rounded-2xl border-slate-100/80 bg-white pl-10 text-sm shadow-md shadow-purple-950/5 w-full"
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100/50 rounded-2xl p-1 h-10 sm:h-11 items-center border border-slate-100/80 shadow-inner">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                className={cn(
                  "h-8 sm:h-9 rounded-xl px-3 flex items-center gap-1.5 transition-all",
                  viewMode === "grid"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                )}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                className={cn(
                  "h-8 sm:h-9 rounded-xl px-3 flex items-center gap-1.5 transition-all",
                  viewMode === "list"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                )}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="size-4" />
              </Button>
            </div>

            <Button
              className="h-10 sm:h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold shadow-md shadow-purple-600/20 px-4"
              onClick={() => setCreateOpen(true)}
            >
              <FolderPlus className="mr-1.5 size-4" />
              <span className="hidden sm:inline">New Folder</span>
              <span className="sm:hidden">Folder</span>
            </Button>
          </div>
        }
      />
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        {/* Storage Card Header */}
        <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] overflow-hidden">
          <CardHeader className="!p-4 sm:!p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                <HardDrive className="size-5 text-[#7c3aed]" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Storage & Deliverables
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Organize photos, videos, and deliverables into folders. Share folders with clients via public links.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl h-9 text-[#7c3aed] border-purple-200 hover:bg-purple-50 font-semibold shrink-0"
              onClick={() => setPlansOpen(true)}
            >
              <Sparkles className="mr-1.5 size-4 text-[#7c3aed]" /> Upgrade Storage
            </Button>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <StorageMeter quota={quota} />
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#7c3aed]" />
          </div>
        ) : (
          <PortfolioFolderGrid
            folders={folders}
            viewMode={viewMode}
            onDelete={handleDeleteFolder}
            onShare={setShareFolder}
          />
        )}
      </div>

      <AppModal
        open={createOpen}
        icon={<FolderPlus className="size-5" />}
        onClose={() => setCreateOpen(false)}
        title="Create Folder"
        description="Folder names must be unique."
        footer={
          <Button
            className="w-full h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10"
            disabled={creating || !newFolderName.trim()}
            onClick={() => void handleCreateFolder()}
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Create Folder"
            )}
          </Button>
        }
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <FloatingInput
            id="folder-name"
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </div>
      </AppModal>

      <PortfolioShareModal
        open={!!shareFolder}
        onClose={() => setShareFolder(null)}
        folder={shareFolder}
        onUpdated={loadData}
      />

      <StoragePlansModal
        open={plansOpen}
        onClose={() => setPlansOpen(false)}
        plans={plans}
        gstRate={gstRate}
        onSuccess={loadData}
      />
    </>
  );
}

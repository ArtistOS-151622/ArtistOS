"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { CheckCircle2, FolderPlus, HardDrive, LayoutGrid, List, Loader2, Search, ShieldCheck, Sparkles, Trash2, Zap } from "lucide-react";

import { HeaderPortal, PageHeader } from "@/components/common/dashboard/dashboard-header-context";
import { AppModal } from "@/components/common/shared/app-modal";
import { SideDrawer } from "@/components/common/shared/side-drawer";
import { FloatingInput } from "@/components/common/shared/floating-input";
import { PortfolioFolderGrid, PortfolioFolderSkeleton } from "@/components/portfolio/portfolio-folder-grid";
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PortfolioPage() {
  const [search, setSearch] = useState("");
  const foldersUrl = `/api/portfolio/folders${search ? `?search=${encodeURIComponent(search)}` : ""}`;
  const { data: foldersJson, mutate: mutateFolders, isLoading: isLoadingFolders } = useSWR(foldersUrl, fetcher);
  const { data: storageJson, mutate: mutateStorage, isLoading: isLoadingStorage } = useSWR('/api/portfolio/storage-info', fetcher);

  const folders: PortfolioFolderWithStats[] = foldersJson?.status ? foldersJson.data.folders : [];
  const quota: QuotaInfo | null = storageJson?.status ? storageJson.data.quota : null;
  const plans: StoragePlanRow[] = storageJson?.status ? (storageJson.data.plans ?? []) : [];
  const gstRate: number = storageJson?.status && storageJson.data.gstRate !== undefined ? storageJson.data.gstRate : 0.18;
  const loading = isLoadingFolders || isLoadingStorage;
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [storageDrawerOpen, setStorageDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [shareFolder, setShareFolder] =
    useState<PortfolioFolderWithStats | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [editFolder, setEditFolder] =
    useState<PortfolioFolderWithStats | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [updatingFolder, setUpdatingFolder] = useState(false);
  const [editError, setEditError] = useState("");



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
      void mutateFolders();
      void mutateStorage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  }

  function handleDeleteFolder(id: number) {
    setDeleteFolderId(id);
  }

  async function confirmDeleteFolder() {
    if (!deleteFolderId) return;
    setDeleting(true);
    try {
      await fetch(`/api/portfolio/folders/${deleteFolderId}`, { method: "DELETE" });
      setDeleteFolderId(null);
      void mutateFolders();
      void mutateStorage();
    } catch (err) {
      console.error("Failed to delete folder:", err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpdateFolder() {
    if (!editFolder || !editFolderName.trim()) return;
    setUpdatingFolder(true);
    setEditError("");
    try {
      const res = await fetch(`/api/portfolio/folders/${editFolder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editFolderName.trim() }),
      });
      const json = await res.json();
      if (!json.status) throw new Error(json.message);
      setEditFolder(null);
      setEditFolderName("");
      void mutateFolders();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update folder",
      );
    } finally {
      setUpdatingFolder(false);
    }
  }

  function startEditFolder(folder: PortfolioFolderWithStats) {
    setEditFolder(folder);
    setEditFolderName(folder.name);
    setEditError("");
  }

  return (
    <>
      <PageHeader title="Portfolio" />
      <HeaderPortal
        search={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#858aa5]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders…"
              className="h-11 rounded-2xl border-slate-100/80 bg-white pl-10 text-sm shadow-md shadow-purple-950/5 w-full"
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Storage Usage Pill - Desktop Only */}
            {quota && (
              <button
                type="button"
                onClick={() => setStorageDrawerOpen(true)}
                className="hidden md:flex items-center gap-2 h-11 px-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-purple-200 transition-all shadow-xs group"
                title="Storage Usage"
              >
                <HardDrive className="size-4 text-[#7c3aed] shrink-0 group-hover:rotate-12 transition-transform" />
                <div className="flex flex-col items-start min-w-[80px]">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Storage</span>
                    <span className="text-[10px] font-black text-[#7c3aed]">
                      {Math.round((quota.used_bytes / quota.total_bytes) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-indigo-600 transition-all"
                      style={{ width: `${Math.min(100, Math.round((quota.used_bytes / quota.total_bytes) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                    {quota.used_bytes_human} / {quota.total_bytes_human}
                  </span>
                </div>
              </button>
            )}

            <div className="flex bg-slate-100/50 rounded-2xl p-1 h-11 items-center border border-slate-100/80 shadow-inner shrink-0">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                className={cn(
                  "h-9 rounded-xl px-2.5 sm:px-3 flex items-center justify-center gap-1.5 transition-all",
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
                  "h-9 rounded-xl px-2.5 sm:px-3 flex items-center justify-center gap-1.5 transition-all",
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
              aria-label="New folder"
              className="h-11 w-11 md:w-auto rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold shadow-md shadow-purple-600/20 px-0 md:px-4 shrink-0 flex items-center justify-center"
              onClick={() => setCreateOpen(true)}
            >
              <FolderPlus className="size-5 md:size-4" />
              <span className="hidden md:inline ml-1.5 font-semibold">New Folder</span>
            </Button>
          </div>
        }
      />

      <div className="space-y-6 pb-12">
        {loading ? (
          <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] p-5 min-h-auto sm:min-h-[calc(100vh-8.5rem)] overflow-hidden">
            <PortfolioFolderSkeleton viewMode={viewMode} />
          </Card>
        ) : (
          <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] p-5 min-h-auto sm:min-h-[calc(100vh-8.5rem)] overflow-hidden">
            <PortfolioFolderGrid
              folders={folders}
              viewMode={viewMode}
              onDelete={handleDeleteFolder}
              onShare={setShareFolder}
              onEdit={startEditFolder}
            />
          </Card>
        )}
      </div>

      {/* Screen Ratio Y-Axis Centered Floating Button on Right Side */}
      <button
        type="button"
        onClick={() => setStorageDrawerOpen(true)}
        className="fixed top-1/2 -translate-y-1/2 right-0 z-40 bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-2xl shadow-purple-950/20 px-3.5 py-3.5 rounded-l-2xl flex items-center gap-2.5 font-semibold text-sm transition-all hover:pr-4 hover:pl-5 active:scale-95 cursor-pointer border-y border-l border-purple-300/40 backdrop-blur-xs group"
        title="Storage & Deliverables"
      >
        <HardDrive className="size-5 shrink-0 group-hover:rotate-12 transition-transform" />
        {/* <span className="hidden sm:inline-block font-bold">Storage & Deliverables</span> */}
      </button>

      {/* Right-side Drawer Modal for Storage & Deliverables */}
      <SideDrawer
        open={storageDrawerOpen}
        side="right"
        icon={<HardDrive className="size-5 text-white" />}
        onClose={() => setStorageDrawerOpen(false)}
        title="Storage & Deliverables"
        description="Organize photos, videos, and deliverables into folders. Share folders with clients via public links."
        footer={
          <Button
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6d28d9] text-white font-bold shadow-lg shadow-purple-600/25 transition-all"
            onClick={() => {
              setStorageDrawerOpen(false);
              setPlansOpen(true);
            }}
          >
            <Sparkles className="mr-2 size-4 text-amber-300" /> Upgrade Storage Plan
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Storage Hero Card - Compact Height Design */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50/70 via-white to-white p-3.5 sm:p-4 shadow-2xs space-y-2.5">
            {/* Top Header Row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Storage Status
              </span>
              {quota && (
                <span className="rounded-full bg-purple-100/80 border border-purple-200/60 px-2.5 py-0.5 text-[10px] font-black text-[#7c3aed] uppercase tracking-wider">
                  {quota.subscription_status === "none" ? "Free Tier" : `${quota.subscription_status} Plan`}
                </span>
              )}
            </div>

            {/* Storage Meter Chart Component */}
            <StorageMeter quota={quota} theme="light" />

            {/* Stat Pillars */}
            {quota && (
              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-purple-100/60 text-center">
                <div className="bg-white rounded-xl p-1.5 border border-purple-100/80 shadow-2xs">
                  <p className="text-[9px] text-purple-600 font-extrabold uppercase tracking-wider">Used</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5 truncate">{quota.used_bytes_human}</p>
                </div>
                <div className="bg-white rounded-xl p-1.5 border border-emerald-100/80 shadow-2xs">
                  <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">Free</p>
                  <p className="text-xs font-black text-emerald-700 mt-0.5 truncate">{quota.remaining_bytes_human}</p>
                </div>
                <div className="bg-white rounded-xl p-1.5 border border-slate-100 shadow-2xs">
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5 truncate">{quota.total_bytes_human}</p>
                </div>
              </div>
            )}
          </div>

          {/* Deliverables Capabilities Overview */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Deliverables & Storage Features
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
                <div className="size-10 rounded-2xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <Zap className="size-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-900">High-Speed CDN Delivery</h5>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Lightning-fast media streaming powered by Cloudflare R2 global CDN network.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-900">Public Client Links</h5>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Share folders securely with optional passcode protection and custom link expiration.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </SideDrawer>

      {/* Standard AppModal for Create Folder */}
      <AppModal
        open={createOpen}
        icon={<FolderPlus className="size-5 text-[#7c3aed]" />}
        onClose={() => setCreateOpen(false)}
        title="Create Folder"
        description="Folder names must be unique."
        footer={
          <Button
            className="w-full h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold shadow-md shadow-purple-600/20"
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

      <AppModal
        open={!!editFolder}
        icon={<FolderPlus className="size-5 text-[#7c3aed]" />}
        onClose={() => setEditFolder(null)}
        title="Edit Folder Name"
        description="Folder names must be unique."
        footer={
          <Button
            className="w-full h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold shadow-md shadow-purple-600/20"
            disabled={updatingFolder || !editFolderName.trim()}
            onClick={() => void handleUpdateFolder()}
          >
            {updatingFolder ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </Button>
        }
      >
        <div className="space-y-4">
          {editError && <p className="text-sm text-rose-600">{editError}</p>}
          <FloatingInput
            id="edit-folder-name"
            label="Folder name"
            value={editFolderName}
            onChange={(e) => setEditFolderName(e.target.value)}
          />
        </div>
      </AppModal>

      <AppModal
        open={!!deleteFolderId}
        icon={<Trash2 className="size-5 text-rose-500" />}
        onClose={() => setDeleteFolderId(null)}
        title="Delete Folder"
        description="Are you sure you want to delete this folder and all its files?"
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-2xl"
              onClick={() => setDeleteFolderId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-md shadow-rose-500/20"
              disabled={deleting}
              onClick={() => void confirmDeleteFolder()}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        }
      >
        <div className="text-sm text-slate-600">
          This action cannot be undone. This will permanently delete the folder and remove access for anyone you've shared it with.
        </div>
      </AppModal>

      <PortfolioShareModal
        open={!!shareFolder}
        onClose={() => setShareFolder(null)}
        folder={shareFolder}
        onUpdated={() => void mutateFolders()}
      />

      <StoragePlansModal
        open={plansOpen}
        onClose={() => setPlansOpen(false)}
        plans={plans}
        gstRate={gstRate}
        onSuccess={() => { void mutateFolders(); void mutateStorage(); }}
      />
    </>
  );
}

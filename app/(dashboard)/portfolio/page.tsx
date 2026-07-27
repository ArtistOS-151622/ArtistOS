"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Loader2, Search } from "lucide-react";

import { PageHeader } from "@/components/common/dashboard/dashboard-header-context";
import { AppModal } from "@/components/common/shared/app-modal";
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
import { Label } from "@/components/ui/label";
import type {
  PortfolioFolderWithStats,
  QuotaInfo,
  StoragePlanRow,
} from "@/lib/portfolio/types";

export default function PortfolioPage() {
  const [folders, setFolders] = useState<PortfolioFolderWithStats[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [plans, setPlans] = useState<StoragePlanRow[]>([]);
  const [gstRate, setGstRate] = useState<number>(0.18);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-xl">Storage & Folders</CardTitle>
              <CardDescription>
                Organize photos, videos, and deliverables into folders. Share
                folders with clients via public links.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl shrink-0"
              onClick={() => setPlansOpen(true)}
            >
              Upgrade Storage
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <StorageMeter quota={quota} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders…"
              className="h-11 rounded-2xl pl-10 border-slate-200"
            />
          </div>
          <Button
            className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9]"
            onClick={() => setCreateOpen(true)}
          >
            <FolderPlus className="mr-2 size-4" />
            New Folder
          </Button>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#7c3aed]" />
          </div>
        ) : (
          <PortfolioFolderGrid
            folders={folders}
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
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="h-11 rounded-2xl"
              placeholder="Bridal Looks 2026"
            />
          </div>
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

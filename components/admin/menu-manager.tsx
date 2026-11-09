"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MenuThumb } from "@/components/kiosk/menu-thumb";
import { useAdminMenu } from "@/hooks/queries";
import { api, ClientApiError } from "@/lib/fetcher";
import { formatPoint } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import type { CategoryDTO, MenuItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MenuFormSheet } from "./menu-form";

const onErr = (e: unknown) => toast.error(e instanceof ClientApiError ? e.message : "처리에 실패했어요");

export function MenuManager() {
  const qc = useQueryClient();
  const menu = useAdminMenu();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ item: MenuItemDTO | null } | null>(null);
  const [deleting, setDeleting] = useState<MenuItemDTO | null>(null);

  const categories = menu.data ?? [];
  const active = categories.find((c) => c.id === activeId) ?? categories[0];
  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.adminMenu });
    qc.invalidateQueries({ queryKey: qk.menu });
  };

  const quickToggle = useMutation({
    mutationFn: ({ item, patch }: { item: MenuItemDTO; patch: Partial<MenuItemDTO> }) => {
      const next = { ...item, ...patch };
      return api(`/api/admin/menu/${item.id}`, {
        method: "PUT",
        body: {
          categoryId: next.categoryId,
          name: next.name,
          description: next.description,
          price: next.price,
          imageUrl: next.imageUrl,
          isAvailable: next.isAvailable,
          isSoldOut: next.isSoldOut,
          badge: next.badge,
          sort: next.sort,
          optionGroups: next.optionGroups.map((g) => ({
            name: g.name,
            required: g.required,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            items: g.items.map((o) => ({ name: o.name, extraPrice: o.extraPrice, isDefault: o.isDefault })),
          })),
        },
      });
    },
    onSuccess: refresh,
    onError: onErr,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/menu/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("메뉴를 삭제했어요");
      refresh();
    },
    onError: onErr,
  });

  if (menu.isPending) return <Skeleton className="h-96" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <CategoryPanel categories={categories} activeId={active?.id ?? null} onSelect={setActiveId} onChanged={refresh} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            {active ? (
              <>
                <span className="tossface">{active.emoji}</span> {active.name}
                <span className="text-sm font-normal text-muted-foreground">{active.items.length}개</span>
              </>
            ) : (
              "카테고리를 먼저 추가해 주세요"
            )}
          </CardTitle>
          <Button size="lg" disabled={!active} onClick={() => setEditing({ item: null })}>
            <Plus /> 메뉴 추가
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {active && active.items.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">이 카테고리에 메뉴가 없어요</p>
          ) : (
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16" />
                  <TableHead>메뉴</TableHead>
                  <TableHead className="text-right">가격</TableHead>
                  <TableHead className="text-center">판매</TableHead>
                  <TableHead className="text-center">품절</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {active?.items.map((i) => (
                  <TableRow key={i.id} className={cn(!i.isAvailable && "opacity-50")}>
                    <TableCell>
                      <MenuThumb imageUrl={i.imageUrl} emoji={active.emoji} name={i.name} className="size-12 rounded-lg [&_span]:text-2xl" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-semibold">
                        {i.name}
                        {i.badge && <Badge variant={i.badge === "BEST" ? "default" : "secondary"}>{i.badge}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {i.optionGroups.length ? i.optionGroups.map((g) => g.name).join(" · ") : "옵션 없음"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPoint(i.price)}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={i.isAvailable} onCheckedChange={(v) => quickToggle.mutate({ item: i, patch: { isAvailable: v } })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={i.isSoldOut} onCheckedChange={(v) => quickToggle.mutate({ item: i, patch: { isSoldOut: v } })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing({ item: i })} aria-label="수정">
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(i)} aria-label="삭제">
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MenuFormSheet
        open={!!editing}
        item={editing?.item ?? null}
        categories={categories}
        defaultCategoryId={active?.id ?? 0}
        onClose={() => setEditing(null)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>&lsquo;{deleting?.name}&rsquo; 메뉴를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              지난 주문 기록은 그대로 남아요. 잠시 팔지 않을 메뉴라면 삭제 대신 &lsquo;판매&rsquo;를 꺼 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) remove.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryPanel({
  categories,
  activeId,
  onSelect,
  onChanged,
}: {
  categories: CategoryDTO[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ name: "", emoji: "☕", sort: 0 });

  const save = useMutation({
    mutationFn: () =>
      editingId === "new"
        ? api("/api/admin/categories", { method: "POST", body: { ...form, isActive: true } })
        : api(`/api/admin/categories/${editingId}`, { method: "PATCH", body: form }),
    onSuccess: () => {
      setEditingId(null);
      onChanged();
    },
    onError: onErr,
  });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<CategoryDTO> }) =>
      api(`/api/admin/categories/${id}`, { method: "PATCH", body }),
    onSuccess: onChanged,
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: onChanged,
    onError: onErr,
  });

  const startEdit = (c?: CategoryDTO) => {
    setEditingId(c?.id ?? "new");
    setForm(c ? { name: c.name, emoji: c.emoji, sort: c.sort } : { name: "", emoji: "☕", sort: categories.length });
  };

  const editor = (
    <div className="space-y-2 rounded-xl border bg-slate-50 p-3">
      <div className="flex gap-2">
        <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-14 text-center text-lg" aria-label="이모지" />
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="카테고리 이름" autoFocus />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">정렬</span>
        <Input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) || 0 })} className="w-20" />
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label="취소">
            <X />
          </Button>
          <Button size="icon" disabled={!form.name.trim()} onClick={() => save.mutate()} aria-label="저장">
            <Check />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>카테고리</CardTitle>
        <Button size="sm" variant="outline" onClick={() => startEdit()}>
          <Plus /> 추가
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {editingId === "new" && editor}
        {categories.map((c) =>
          editingId === c.id ? (
            <div key={c.id}>{editor}</div>
          ) : (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2.5 transition",
                c.id === activeId ? "bg-primary/10 text-primary" : "hover:bg-slate-100",
              )}
            >
              <button onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="tossface text-xl">{c.emoji}</span>
                <span className={cn("truncate font-semibold", !c.isActive && "text-muted-foreground line-through")}>{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.items.length}</span>
              </button>
              <Switch
                checked={c.isActive}
                onCheckedChange={(v) => patch.mutate({ id: c.id, body: { isActive: v } })}
                aria-label="키오스크에 표시"
              />
              <button onClick={() => startEdit(c)} className="rounded p-1 text-muted-foreground hover:bg-white" aria-label="수정">
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={() => remove.mutate(c.id)}
                className="rounded p-1 text-muted-foreground hover:bg-white disabled:opacity-30"
                disabled={c.items.length > 0}
                title={c.items.length > 0 ? "메뉴가 있는 카테고리는 삭제할 수 없어요" : "삭제"}
                aria-label="삭제"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ),
        )}
        <p className="pt-2 text-xs text-muted-foreground">스위치를 끄면 키오스크에서 카테고리가 숨겨져요.</p>
      </CardContent>
    </Card>
  );
}

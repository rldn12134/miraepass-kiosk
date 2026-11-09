"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, ClientApiError } from "@/lib/fetcher";
import { qk } from "@/lib/query-keys";
import type { CategoryDTO, MenuItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type OptionItemDraft = { name: string; extraPrice: number; isDefault: boolean };
type OptionGroupDraft = { name: string; required: boolean; minSelect: number; maxSelect: number; items: OptionItemDraft[] };
type Draft = {
  categoryId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isSoldOut: boolean;
  badge: "NEW" | "BEST" | null;
  sort: number;
  optionGroups: OptionGroupDraft[];
};

const PRESETS: Record<string, OptionGroupDraft> = {
  온도: { name: "온도", required: true, minSelect: 1, maxSelect: 1, items: [{ name: "HOT", extraPrice: 0, isDefault: false }, { name: "ICE", extraPrice: 0, isDefault: true }] },
  사이즈: { name: "사이즈", required: true, minSelect: 1, maxSelect: 1, items: [{ name: "R", extraPrice: 0, isDefault: true }, { name: "L", extraPrice: 500, isDefault: false }] },
  추가: { name: "추가", required: false, minSelect: 0, maxSelect: 2, items: [{ name: "샷 추가", extraPrice: 500, isDefault: false }, { name: "시럽 추가", extraPrice: 300, isDefault: false }] },
};

function toDraft(item: MenuItemDTO | null, categoryId: number): Draft {
  if (!item) {
    return { categoryId, name: "", description: "", price: 0, imageUrl: null, isAvailable: true, isSoldOut: false, badge: null, sort: 0, optionGroups: [] };
  }
  return {
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    isSoldOut: item.isSoldOut,
    badge: item.badge,
    sort: item.sort,
    optionGroups: item.optionGroups.map((g) => ({
      name: g.name,
      required: g.required,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      items: g.items.map((o) => ({ name: o.name, extraPrice: o.extraPrice, isDefault: o.isDefault })),
    })),
  };
}

export function MenuFormSheet({
  open,
  item,
  categories,
  defaultCategoryId,
  onClose,
}: {
  open: boolean;
  item: MenuItemDTO | null;
  categories: CategoryDTO[];
  defaultCategoryId: number;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        {open && (
          <MenuForm key={item?.id ?? "new"} item={item} categories={categories} defaultCategoryId={defaultCategoryId} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function MenuForm({
  item,
  categories,
  defaultCategoryId,
  onClose,
}: {
  item: MenuItemDTO | null;
  categories: CategoryDTO[];
  defaultCategoryId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [d, setD] = useState<Draft>(() => toDraft(item, defaultCategoryId));
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api<{ url: string }>("/api/admin/upload", { method: "POST", body: fd });
    },
    onSuccess: ({ url }) => set("imageUrl", url),
    onError: (e) => toast.error(e instanceof ClientApiError ? e.message : "업로드에 실패했어요"),
  });

  const save = useMutation({
    mutationFn: () =>
      item ? api(`/api/admin/menu/${item.id}`, { method: "PUT", body: d }) : api("/api/admin/menu", { method: "POST", body: d }),
    onSuccess: () => {
      toast.success(item ? "메뉴를 수정했어요" : "메뉴를 추가했어요");
      qc.invalidateQueries({ queryKey: qk.adminMenu });
      qc.invalidateQueries({ queryKey: qk.menu });
      onClose();
    },
    onError: (e) => {
      const issues = e instanceof ClientApiError ? (e.extra.issues as { message: string }[] | undefined) : undefined;
      toast.error(issues?.[0]?.message ?? (e instanceof ClientApiError ? e.message : "저장에 실패했어요"));
    },
  });

  const updateGroup = (gi: number, patch: Partial<OptionGroupDraft>) =>
    set(
      "optionGroups",
      d.optionGroups.map((g, i) => (i === gi ? { ...g, ...patch } : g)),
    );
  const updateOption = (gi: number, oi: number, patch: Partial<OptionItemDraft>) =>
    updateGroup(gi, { items: d.optionGroups[gi].items.map((o, i) => (i === oi ? { ...o, ...patch } : o)) });

  const valid = d.name.trim() && d.price >= 0 && d.optionGroups.every((g) => g.name.trim() && g.items.length && g.items.every((o) => o.name.trim()));

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{item ? "메뉴 수정" : "새 메뉴"}</SheetTitle>
        <SheetDescription>저장하면 키오스크에 바로 반영돼요.</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section className="flex gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex size-28 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed bg-slate-50 text-sm text-muted-foreground"
          >
            {d.imageUrl ? (
              <img src={d.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
            ) : upload.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <ImagePlus className="size-6" />
                이미지
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = "";
            }}
          />
          <div className="flex-1 space-y-3">
            <Field label="메뉴 이름">
              <Input value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={30} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="가격 (P)">
                <Input type="number" min={0} step={100} value={d.price} onChange={(e) => set("price", Math.max(0, Number(e.target.value) || 0))} />
              </Field>
              <Field label="카테고리">
                <Select value={String(d.categoryId)} onValueChange={(v) => set("categoryId", Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.emoji} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {d.imageUrl && (
              <button type="button" className="text-xs text-muted-foreground underline" onClick={() => set("imageUrl", null)}>
                이미지 제거
              </button>
            )}
          </div>
        </section>

        <Field label="설명">
          <Textarea value={d.description} onChange={(e) => set("description", e.target.value)} maxLength={100} rows={2} />
        </Field>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="판매">
            <Switch checked={d.isAvailable} onCheckedChange={(v) => set("isAvailable", v)} />
          </Field>
          <Field label="품절">
            <Switch checked={d.isSoldOut} onCheckedChange={(v) => set("isSoldOut", v)} />
          </Field>
          <Field label="뱃지">
            <Select value={d.badge ?? "none"} onValueChange={(v) => set("badge", v === "none" ? null : (v as "NEW" | "BEST"))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">없음</SelectItem>
                <SelectItem value="BEST">BEST</SelectItem>
                <SelectItem value="NEW">NEW</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="정렬 순서">
            <Input type="number" value={d.sort} onChange={(e) => set("sort", Number(e.target.value) || 0)} />
          </Field>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">옵션</h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(PRESETS).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => set("optionGroups", [...d.optionGroups, structuredClone(PRESETS[k])])}
                >
                  <Plus /> {k}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  set("optionGroups", [
                    ...d.optionGroups,
                    { name: "", required: false, minSelect: 0, maxSelect: 1, items: [{ name: "", extraPrice: 0, isDefault: false }] },
                  ])
                }
              >
                <Plus /> 직접 추가
              </Button>
            </div>
          </div>
          {d.optionGroups.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-muted-foreground">옵션이 없는 메뉴예요</p>}
          {d.optionGroups.map((g, gi) => (
            <div key={gi} className="space-y-3 rounded-2xl border bg-white p-4">
              <div className="flex items-end gap-2">
                <Field label="그룹 이름" className="flex-1">
                  <Input value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} placeholder="예) 온도" />
                </Field>
                <Button type="button" variant="ghost" size="icon-lg" onClick={() => set("optionGroups", d.optionGroups.filter((_, i) => i !== gi))} aria-label="그룹 삭제">
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="필수">
                  <Switch
                    checked={g.required}
                    onCheckedChange={(v) => updateGroup(gi, { required: v, minSelect: v ? Math.max(1, g.minSelect) : 0 })}
                  />
                </Field>
                <Field label="최소 선택">
                  <Input type="number" min={0} max={10} value={g.minSelect} onChange={(e) => updateGroup(gi, { minSelect: Number(e.target.value) || 0 })} />
                </Field>
                <Field label="최대 선택">
                  <Input type="number" min={1} max={10} value={g.maxSelect} onChange={(e) => updateGroup(gi, { maxSelect: Math.max(1, Number(e.target.value) || 1) })} />
                </Field>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_96px_52px_36px] gap-2 text-xs font-medium text-muted-foreground">
                  <span>항목</span>
                  <span>추가 금액</span>
                  <span>기본</span>
                  <span />
                </div>
                {g.items.map((o, oi) => (
                  <div key={oi} className="grid grid-cols-[1fr_96px_52px_36px] items-center gap-2">
                    <Input value={o.name} onChange={(e) => updateOption(gi, oi, { name: e.target.value })} placeholder="예) ICE" />
                    <Input type="number" min={0} step={100} value={o.extraPrice} onChange={(e) => updateOption(gi, oi, { extraPrice: Math.max(0, Number(e.target.value) || 0) })} />
                    <Switch
                      checked={o.isDefault}
                      onCheckedChange={(v) =>
                        updateGroup(gi, {
                          items: g.items.map((x, i) => (i === oi ? { ...x, isDefault: v } : g.maxSelect === 1 && v ? { ...x, isDefault: false } : x)),
                        })
                      }
                    />
                    <button
                      type="button"
                      disabled={g.items.length <= 1}
                      onClick={() => updateGroup(gi, { items: g.items.filter((_, i) => i !== oi) })}
                      className={cn("flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 disabled:opacity-30")}
                      aria-label="항목 삭제"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateGroup(gi, { items: [...g.items, { name: "", extraPrice: 0, isDefault: false }] })}
                >
                  <Plus /> 항목 추가
                </Button>
              </div>
            </div>
          ))}
        </section>
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t">
        <Button variant="outline" size="lg" onClick={onClose}>
          취소
        </Button>
        <Button size="lg" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="animate-spin" />}
          저장
        </Button>
      </SheetFooter>
    </>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

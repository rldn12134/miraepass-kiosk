"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAdminMenu } from "@/hooks/queries";
import { api, ClientApiError } from "@/lib/fetcher";
import { formatPoint } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import type { CategoryDTO } from "@/lib/types";

export function SoldOutDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const menu = useAdminMenu();

  const toggle = useMutation({
    mutationFn: ({ id, soldOut }: { id: number; soldOut: boolean }) =>
      api(`/api/menu/${id}/soldout`, { method: "PATCH", body: { soldOut } }),
    onMutate: async ({ id, soldOut }) => {
      await qc.cancelQueries({ queryKey: qk.adminMenu });
      const prev = qc.getQueryData<CategoryDTO[]>(qk.adminMenu);
      qc.setQueryData<CategoryDTO[]>(qk.adminMenu, (d) =>
        d?.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, isSoldOut: soldOut } : i)) })),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.adminMenu, ctx?.prev);
      toast.error(e instanceof ClientApiError ? e.message : "변경에 실패했어요");
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>품절 관리</SheetTitle>
          <SheetDescription>스위치를 켜면 키오스크에 바로 &lsquo;품절&rsquo;로 표시돼요.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          {menu.data
            ?.filter((c) => c.items.some((i) => i.isAvailable))
            .map((c) => (
              <section key={c.id}>
                <h3 className="mb-2 flex items-center gap-1.5 font-bold">
                  <span className="tossface">{c.emoji}</span> {c.name}
                </h3>
                <ul className="divide-y rounded-xl border bg-white">
                  {c.items
                    .filter((i) => i.isAvailable)
                    .map((i) => (
                      <li key={i.id} className="flex items-center justify-between px-4 py-3">
                        <span>
                          <span className={i.isSoldOut ? "text-muted-foreground line-through" : "font-semibold"}>{i.name}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{formatPoint(i.price)}</span>
                        </span>
                        <label className="flex items-center gap-2 text-sm">
                          <span className={i.isSoldOut ? "font-bold text-destructive" : "text-muted-foreground"}>품절</span>
                          <Switch checked={i.isSoldOut} onCheckedChange={(v) => toggle.mutate({ id: i.id, soldOut: v })} />
                        </label>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

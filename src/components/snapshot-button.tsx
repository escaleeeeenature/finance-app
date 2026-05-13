"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Check } from "lucide-react";
import { recordSnapshot } from "@/lib/actions/history";

export function SnapshotButton() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    startTransition(async () => {
      await recordSnapshot();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50"
    >
      {done ? (
        <>
          <Check size={14} className="text-emerald-500" />
          Enregistré !
        </>
      ) : isPending ? (
        <>
          <Camera size={14} className="animate-pulse" />
          Snapshot…
        </>
      ) : (
        <>
          <Camera size={14} />
          Snapshot
        </>
      )}
    </Button>
  );
}

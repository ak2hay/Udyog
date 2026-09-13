"use client";

import { useState, useTransition } from "react";
import { completeJobCard, startJobCard } from "@/app/actions/manufacturing";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { formatQty } from "@/lib/utils";

type JobCard = {
  id: string;
  number: string;
  operationName: string;
  requiredQuantity: string | null;
  completedQuantity: string | null;
  scrapQuantity: string | null;
  status: string;
  operatorName: string | null;
};

export function JobCardPanel({ card }: { card: JobCard }) {
  const [operator, setOperator] = useState(card.operatorName || "Raj");
  const [qty, setQty] = useState(card.requiredQuantity || "0");
  const [scrap, setScrap] = useState("0");
  const [pending, startTransition] = useTransition();

  return (
    <Card className="border-l-4 border-l-[var(--color-accent)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-[var(--color-muted)]">{card.number}</p>
          <h3 className="text-lg font-semibold text-[var(--color-primary)]">{card.operationName}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Required: {formatQty(card.requiredQuantity)}
          </p>
        </div>
        <Badge
          tone={
            card.status === "completed"
              ? "success"
              : card.status === "in_progress"
                ? "warning"
                : "neutral"
          }
        >
          {card.status}
        </Badge>
      </div>

      {card.status === "pending" ? (
        <div className="mt-4 space-y-3">
          <div>
            <Label>Operator</Label>
            <Input value={operator} onChange={(e) => setOperator(e.target.value)} />
          </div>
          <Button
            className="w-full py-3 text-base"
            disabled={pending}
            onClick={() => startTransition(() => startJobCard(card.id, operator))}
          >
            START
          </Button>
        </div>
      ) : null}

      {card.status === "in_progress" ? (
        <div className="mt-4 space-y-3">
          <div>
            <Label>Completed qty</Label>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <Label>Scrap qty</Label>
            <Input value={scrap} onChange={(e) => setScrap(e.target.value)} />
          </div>
          <Button
            className="w-full py-3 text-base"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("jobCardId", card.id);
              fd.set("completedQuantity", qty);
              fd.set("scrapQuantity", scrap);
              startTransition(() => completeJobCard(fd));
            }}
          >
            COMPLETE
          </Button>
        </div>
      ) : null}

      {card.status === "completed" ? (
        <p className="mt-4 text-sm text-[var(--color-success)]">
          Done · {formatQty(card.completedQuantity)} ok · {formatQty(card.scrapQuantity)} scrap
          {card.operatorName ? ` · ${card.operatorName}` : ""}
        </p>
      ) : null}
    </Card>
  );
}

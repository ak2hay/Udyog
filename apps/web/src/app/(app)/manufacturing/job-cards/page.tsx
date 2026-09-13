import { listJobCards } from "@/app/actions/manufacturing";
import { PageHeader } from "@/components/ui";
import { JobCardPanel } from "@/components/job-card-panel";

export default async function JobCardsPage() {
  const cards = await listJobCards();
  return (
    <div>
      <PageHeader
        title="Job cards"
        description="Shop-floor friendly operations — start, pause context, complete"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <JobCardPanel key={card.id} card={card} />
        ))}
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          No job cards yet. Create a production order with routing to generate them.
        </p>
      ) : null}
    </div>
  );
}

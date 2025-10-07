import { PageHeader } from "@/components/page-header";

export default function ProductionOverviewPage() {
  return (
    <>
      <PageHeader
        title="Production Overview"
        description="A real-time summary of all production activities."
      />
      <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Live summary graphs and metrics for stock, planning, and ruling will be displayed here.</p>
      </div>
    </>
  );
}

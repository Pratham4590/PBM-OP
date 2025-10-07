import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PlusCircle } from "lucide-react";

export default function StockPage() {
  return (
    <>
      <PageHeader
        title="Stock Management"
        description="Track and manage your paper stock in real-time."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </PageHeader>
      <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Stock table and management UI will be displayed here.</p>
      </div>
    </>
  );
}

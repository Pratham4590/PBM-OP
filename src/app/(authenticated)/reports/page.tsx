import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { FileDown } from "lucide-react";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and view detailed production and efficiency reports."
      >
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Export to PDF
        </Button>
      </PageHeader>
      <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Color-coded reports table with filtering and export functionality will be displayed here.</p>
      </div>
    </>
  );
}

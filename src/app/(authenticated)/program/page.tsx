import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PlusCircle } from "lucide-react";

export default function ProgramPage() {
  return (
    <>
      <PageHeader
        title="Production Program"
        description="Create and manage production programs with detailed calculations."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Program
        </Button>
      </PageHeader>
      <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Program list and creation form with auto-calculations will be displayed here.</p>
      </div>
    </>
  );
}

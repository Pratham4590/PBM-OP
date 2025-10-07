import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PlusCircle } from "lucide-react";

export default function RulingPage() {
  return (
    <>
      <PageHeader
        title="Reel Ruling"
        description="Log reel ruling with or without a program, and manage multiple rulings per reel."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Reel Ruling
        </Button>
      </PageHeader>
       <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Reel ruling logs and the multi-step ruling modal will be displayed here.</p>
      </div>
    </>
  );
}

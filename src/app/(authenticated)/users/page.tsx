import { PageHeader } from "@/components/page-header";

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users & Management"
        description="Manage user roles and permissions. (Admin only)"
      />
      <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-96 flex items-center justify-center">
        <p className="text-muted-foreground">User management table for promoting/demoting users will be displayed here.</p>
      </div>
    </>
  );
}

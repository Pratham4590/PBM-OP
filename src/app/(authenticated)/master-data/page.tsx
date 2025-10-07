import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MasterDataPage() {
  return (
    <>
      <PageHeader
        title="Master Data"
        description="Manage reference data for paper, items, and more."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paper Types</CardTitle>
            <CardDescription>
              Define the types of paper used in production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper Name</TableHead>
                  <TableHead>GSM</TableHead>
                  <TableHead className="text-right">Length (cm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Maplitho</TableCell>
                  <TableCell>
                    <Badge variant="outline">58</Badge>
                  </TableCell>
                  <TableCell className="text-right">91.5</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Creamwove</TableCell>
                  <TableCell>
                    <Badge variant="outline">60</Badge>
                  </TableCell>
                  <TableCell className="text-right">88</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Coated Art</TableCell>
                  <TableCell>
                    <Badge variant="outline">120</Badge>
                  </TableCell>
                  <TableCell className="text-right">70</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Item Types</CardTitle>
            <CardDescription>
              Define the ruling types for notebooks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Short Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Single Line</TableCell>
                  <TableCell className="text-right">SL</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Double Line</TableCell>
                  <TableCell className="text-right">DL</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Four Line</TableCell>
                  <TableCell className="text-right">FL</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Square Line</TableCell>
                  <TableCell className="text-right">SQL</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

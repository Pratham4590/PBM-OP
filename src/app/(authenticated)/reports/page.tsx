'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { FileDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Ruling, PaperType, ItemType, RulingEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


type ReportRow = RulingEntry & {
  reelNo: string;
  serialNo: string;
  paperTypeId: string;
  reelWeight: number;
};

export default function ReportsPage() {
  const firestore = useFirestore();

  const rulingsQuery = useMemoFirebase(() => firestore && collection(firestore, 'reels'), [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore && collection(firestore, 'paperTypes'), [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore && collection(firestore, 'itemTypes'), [firestore]);

  const { data: rulings, isLoading: loadingRulings } = useCollection<Ruling>(rulingsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);

  const [paperFilter, setPaperFilter] = useState('all');
  const [itemFilter, setItemFilter] = useState('all');
  
  const reportData = useMemo((): ReportRow[] => {
    if (!rulings) return [];
    return rulings.flatMap(ruling => 
      ruling.entries.map(entry => ({
        ...entry,
        reelNo: ruling.reelNo,
        serialNo: ruling.serialNo,
        paperTypeId: ruling.paperTypeId,
        reelWeight: ruling.reelWeight,
      }))
    );
  }, [rulings]);

  const filteredData = useMemo(() => {
    return reportData.filter(row => {
      const paperMatch = paperFilter === 'all' || row.paperTypeId === paperFilter;
      const itemMatch = itemFilter === 'all' || row.itemTypeId === itemFilter;
      return paperMatch && itemMatch;
    });
  }, [reportData, paperFilter, itemFilter]);

  const getPaperTypeName = (paperTypeId: string) => paperTypes?.find(p => p.id === paperTypeId)?.name || 'N/A';
  const getItemTypeName = (itemTypeId: string) => itemTypes?.find(i => i.id === itemTypeId)?.name || 'N/A';

  const handleExport = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Production Report", 15, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 30);

    const tableColumn = ["Reel No.", "Paper Type", "Item Ruled", "Reel Wt.", "Sheets Ruled", "Theoretical", "Difference"];
    const tableRows: (string | number)[][] = [];

    filteredData.forEach(row => {
        const rowData = [
            row.reelNo,
            getPaperTypeName(row.paperTypeId),
            getItemTypeName(row.itemTypeId),
            `${row.reelWeight.toLocaleString()} kg`,
            row.sheetsRuled.toLocaleString(),
            Math.round(row.theoreticalSheets).toLocaleString(),
            Math.round(row.difference).toLocaleString()
        ];
        tableRows.push(rowData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        headStyles: { fillColor: [38, 115, 101] }, // Corresponds to primary color
        didDrawPage: (data) => {
            // Footer
            const str = `Page ${doc.internal.getNumberOfPages()}`;
            doc.setFontSize(10);
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.text(str, data.settings.margin.left, pageHeight - 10);
        }
    });
    
    doc.save("production_report.pdf");
  };
  
  const isLoading = loadingRulings || loadingPaperTypes || loadingItemTypes;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and view detailed production and efficiency reports."
      >
        <Button variant="outline" onClick={handleExport} disabled={isLoading || filteredData.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          Export to PDF
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Production Report</CardTitle>
          <CardDescription>
            A detailed breakdown of every ruling entry. Use the filters to narrow down the results.
          </CardDescription>
          <div className="flex items-center space-x-4 pt-4">
             <Select value={paperFilter} onValueChange={setPaperFilter}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by paper type..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Paper Types</SelectItem>
                    {paperTypes?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={itemFilter} onValueChange={setItemFilter}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by item type..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Item Types</SelectItem>
                    {itemTypes?.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reel No.</TableHead>
                <TableHead>Paper Type</TableHead>
                <TableHead>Item Ruled</TableHead>
                <TableHead>Reel Wt.</TableHead>
                <TableHead className="text-right">Sheets Ruled</TableHead>
                <TableHead className="text-right">Theoretical</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading reports...
                  </TableCell>
                </TableRow>
              ) : filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <TableRow key={`${row.serialNo}-${row.id}`}>
                    <TableCell className="font-medium">{row.reelNo}</TableCell>
                    <TableCell>{getPaperTypeName(row.paperTypeId)}</TableCell>
                    <TableCell>{getItemTypeName(row.itemTypeId)}</TableCell>
                    <TableCell>{row.reelWeight.toLocaleString()} kg</TableCell>
                    <TableCell className="text-right">{row.sheetsRuled.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Math.round(row.theoreticalSheets).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                       <Badge variant={row.difference >= 0 ? 'default' : 'destructive'} className={row.difference >= 0 ? 'bg-green-600' : ''}>
                        {Math.round(row.difference).toLocaleString()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

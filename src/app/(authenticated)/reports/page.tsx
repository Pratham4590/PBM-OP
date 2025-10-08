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
import { Ruling as RulingType, PaperType, ItemType, RulingEntry } from '@/lib/types';
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

  const { data: rulings, isLoading: loadingRulings } = useCollection<RulingType>(rulingsQuery);
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

  const getPaperTypeName = (paperTypeId: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  const getItemTypeName = (itemTypeId: string) => itemTypes?.find(i => i.id === itemTypeId)?.itemName || 'N/A';

  const handleExport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const tableHead = [["Reel No.", "Paper", "Item", "Reel Wt.", "Ruled", "Theory", "Diff"]];
    const tableBody = filteredData.map(row => {
      const difference = Math.round(row.difference);
      return [
        row.reelNo,
        getPaperTypeName(row.paperTypeId),
        getItemTypeName(row.itemTypeId),
        row.reelWeight.toLocaleString(),
        row.sheetsRuled.toLocaleString(),
        Math.round(row.theoreticalSheets).toLocaleString(),
        difference.toLocaleString()
      ];
    });

    const totalReelWeight = filteredData.reduce((sum, row) => sum + row.reelWeight, 0);
    const totalSheetsRuled = filteredData.reduce((sum, row) => sum + row.sheetsRuled, 0);
    const totalTheoreticalSheets = filteredData.reduce((sum, row) => sum + row.theoreticalSheets, 0);
    const totalDifference = totalSheetsRuled - totalTheoreticalSheets;

    const totalsBody = [
        ['', '', 'TOTALS', totalReelWeight.toLocaleString(), totalSheetsRuled.toLocaleString(), Math.round(totalTheoreticalSheets).toLocaleString(), Math.round(totalDifference).toLocaleString()]
    ];

    autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 25,
        margin: { top: 25, right: 10, bottom: 15, left: 10 },
        headStyles: { fillColor: [34, 139, 34] }, // Forest Green
        didParseCell: (data) => {
            // Align numeric columns to the right
            if (data.column.index >= 3 && data.cell.section === 'body') {
                data.cell.styles.halign = 'right';
            }
        },
        didDrawCell: (data) => {
            if (data.column.index === 6 && data.cell.section === 'body') {
                const value = parseFloat(String(data.cell.text).replace(/,/g, ''));
                if (value < 0) {
                    doc.setTextColor(220, 38, 38); // Red for negative
                }
            }
        },
        willDrawCell: (data) => {
            doc.setTextColor(0, 0, 0); // Reset text color
        },
        didDrawPage: (data) => {
            // Header
            doc.setFontSize(20);
            doc.text("Production Report", data.settings.margin.left, 15);
            doc.setFontSize(12);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, data.settings.margin.left, 20);

            // Footer (Page Number)
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(`Page ${doc.internal.pages.length - 1} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        
            // Border
            doc.setDrawColor(0, 0, 0); // Black
            doc.rect(5, 5, doc.internal.pageSize.width - 10, doc.internal.pageSize.height - 10);
        },
    });

    // Add the Totals table at the end
    const lastTable = (doc as any).lastAutoTable;
    autoTable(doc, {
        body: totalsBody,
        startY: lastTable.finalY + 5,
        margin: { left: 10, right: 10 },
        theme: 'grid',
        bodyStyles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] },
        didParseCell: (data) => {
             if (data.column.index <= 1) {
                data.cell.styles.halign = 'left';
            }
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
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 pt-4">
             <Select value={paperFilter} onValueChange={setPaperFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-11">
                    <SelectValue placeholder="Filter by paper type..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Paper Types</SelectItem>
                    {paperTypes?.map(p => <SelectItem key={p.id} value={p.id}>{p.paperName}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={itemFilter} onValueChange={setItemFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-11">
                    <SelectValue placeholder="Filter by item type..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Item Types</SelectItem>
                    {itemTypes?.map(i => <SelectItem key={i.id} value={i.id}>{i.itemName}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                  filteredData.map((row, index) => (
                    <TableRow key={`${row.serialNo}-${row.id}-${index}`}>
                      <TableCell className="font-medium whitespace-nowrap">{row.reelNo}</TableCell>                      
                      <TableCell className="whitespace-nowrap">{getPaperTypeName(row.paperTypeId)}</TableCell>
                      <TableCell className="whitespace-nowrap">{getItemTypeName(row.itemTypeId)}</TableCell>
                      <TableCell>{row.reelWeight.toLocaleString()} kg</TableCell>
                      <TableCell className="text-right">{row.sheetsRuled.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Math.round(row.theoreticalSheets).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                         <Badge variant={row.difference >= 0 ? 'default' : 'destructive'} className={row.difference >= 0 ? 'bg-green-600 dark:bg-green-800' : ''}>
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
          </div>
        </CardContent>
      </Card>
    </>
  );
}

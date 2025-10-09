'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { FileDown, MoreVertical, Trash2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, Timestamp, doc, writeBatch, getDoc } from 'firebase/firestore';
import { Ruling as RulingType, PaperType, ItemType, Reel, User as AppUser } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const rulingsQuery = useMemoFirebase(() => firestore && collection(firestore, 'rulings'), [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore && collection(firestore, 'paperTypes'), [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore && collection(firestore, 'itemTypes'), [firestore]);

  const { data: rulings, isLoading: loadingRulings } = useCollection<RulingType>(rulingsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);

  const [paperFilter, setPaperFilter] = useState('all');
  const [itemFilter, setItemFilter] = useState('all');
  
  const canEdit = useMemo(() => currentUser?.role === 'Admin', [currentUser]);

  const filteredData = useMemo(() => {
    if (!rulings) return [];
    return rulings.filter(row => {
      const paperMatch = paperFilter === 'all' || row.paperTypeId === paperFilter;
      const itemMatch = itemFilter === 'all' || row.rulingEntries.some(e => e.itemTypeId === itemFilter);
      return paperMatch && itemMatch;
    }).sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date as string).getTime();
        const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date as string).getTime();
        return dateB - dateA;
    });
  }, [rulings, paperFilter, itemFilter]);

  const getPaperTypeName = (paperTypeId: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  const getItemTypeName = (itemTypeId: string) => itemTypes?.find(i => i.id === itemTypeId)?.itemName || 'N/A';

  const handleDeleteRuling = async (ruling: RulingType) => {
    if (!firestore || !canEdit) {
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to delete rulings.' });
        return;
    }

    try {
        const batch = writeBatch(firestore);

        // 1. Delete the ruling document
        const rulingDocRef = doc(firestore, 'rulings', ruling.id);
        batch.delete(rulingDocRef);

        // 2. Revert stock changes on the reel
        const reelDocRef = doc(firestore, 'reels', ruling.reelId);
        
        const reelDoc = await getDoc(reelDocRef);
        if (reelDoc.exists()) {
            const reelData = reelDoc.data() as Reel;
            const newAvailableSheets = (reelData.availableSheets || 0) + ruling.totalSheetsRuled;
            
            const reelUpdate: Partial<Reel> = {
                availableSheets: newAvailableSheets,
                status: reelData.status === 'Finished' && newAvailableSheets > 100 ? 'In Use' : reelData.status,
            };
            batch.update(reelDocRef, reelUpdate as any);
        }

        await batch.commit();
        toast({ title: 'Ruling Deleted', description: `The ruling for reel ${ruling.reelNo} has been deleted and stock has been reverted.`});
    } catch(e: any) {
        console.error("Error deleting ruling: ", e);
        toast({ variant: 'destructive', title: 'Delete failed', description: e.message });
    }
  }

  const handleExport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    let tableBody: any[] = [];
    filteredData.forEach(ruling => {
      ruling.rulingEntries.forEach(entry => {
        if(itemFilter !== 'all' && entry.itemTypeId !== itemFilter) return;

        const difference = Math.abs(Math.round(entry.difference));
        tableBody.push([
          ruling.reelNo,
          getPaperTypeName(ruling.paperTypeId),
          getItemTypeName(entry.itemTypeId),
          entry.cutoff.toString(),
          entry.sheetsRuled.toLocaleString(),
          Math.round(entry.theoreticalSheets).toLocaleString(),
          difference.toLocaleString()
        ]);
      });
    });

    const totalReelWeight = filteredData.reduce((sum, ruling) => sum + ruling.startWeight, 0);
    const totalSheetsRuled = tableBody.reduce((sum, row) => sum + parseFloat(row[4].replace(/,/g, '')), 0);
    const totalTheoreticalSheets = tableBody.reduce((sum, row) => sum + parseFloat(row[5].replace(/,/g, '')), 0);
    const totalDifference = tableBody.reduce((sum, row) => sum + parseFloat(row[6].replace(/,/g, '')), 0);
    
    const totalsBody = [
        ['Total Reel Weight (kg)', totalReelWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})],
        ['Total Sheets Ruled', totalSheetsRuled.toLocaleString()],
        ['Total Theoretical Sheets', Math.round(totalTheoreticalSheets).toLocaleString()],
        ['Total Difference', Math.round(totalDifference).toLocaleString()],
    ];


    autoTable(doc, {
        head: [["Reel No.", "Paper", "Item", "Cutoff", "Ruled", "Theory", "Diff"]],
        body: tableBody,
        startY: 25,
        margin: { top: 25, right: 10, bottom: 15, left: 10 },
        headStyles: { fillColor: [38, 86, 166] },
        didParseCell: (data) => {
            if (data.column.index >= 4 && data.cell.section === 'body') {
                data.cell.styles.halign = 'right';
            }
        },
        didDrawCell: (data) => {
            if (data.column.index === 6 && data.cell.section === 'body') {
                const ruled = parseFloat(String(tableBody[data.row.index][4]).replace(/,/g, ''));
                const theoretical = parseFloat(String(tableBody[data.row.index][5]).replace(/,/g, ''));
                if (ruled > theoretical) {
                    doc.setTextColor(234, 88, 12); // Orange for over-ruled
                }
            }
        },
        willDrawCell: () => {
            doc.setTextColor(0, 0, 0);
        },
        didDrawPage: (data) => {
            doc.setFontSize(20);
            doc.text("Production Report", data.settings.margin.left, 15);
            doc.setFontSize(12);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, data.settings.margin.left, 20);
            const pageCount = doc.internal.getNumberOfPages();
            doc.text(`Page ${doc.internal.pages.length - 1} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        },
    });

    const lastTable = (doc as any).lastAutoTable;
    if (tableBody.length > 0) {
      autoTable(doc, {
          body: totalsBody,
          startY: lastTable.finalY + 5,
          margin: { left: 10, right: 10 },
          theme: 'grid',
          bodyStyles: { fontStyle: 'bold' },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'right' },
          }
      });
    }

    doc.save("production_report.pdf");
  };
  
  const isLoading = loadingRulings || loadingPaperTypes || loadingItemTypes || isLoadingCurrentUser;

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
                  <TableHead>Cutoff</TableHead>
                  <TableHead className="text-right">Sheets Ruled</TableHead>
                  <TableHead className="text-right">Theoretical</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  {canEdit && <TableHead className="w-[50px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 8 : 7} className="h-24 text-center">
                      Loading reports...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length > 0 ? (
                  filteredData.map((ruling) => (
                     ruling.rulingEntries.filter(entry => itemFilter === 'all' || entry.itemTypeId === itemFilter).map((entry, index) => {
                      const isOverRuled = entry.sheetsRuled > entry.theoreticalSheets;
                      return (
                        <TableRow key={`${ruling.id}-${index}`}>
                          <TableCell className="font-medium whitespace-nowrap">{ruling.reelNo}</TableCell>                      
                          <TableCell className="whitespace-nowrap">{getPaperTypeName(ruling.paperTypeId)}</TableCell>
                          <TableCell className="whitespace-nowrap">{getItemTypeName(entry.itemTypeId)}</TableCell>
                          <TableCell>{entry.cutoff} cm</TableCell>
                          <TableCell className="text-right">{entry.sheetsRuled.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Math.round(entry.theoreticalSheets).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={isOverRuled ? 'destructive' : 'default'} className={isOverRuled ? 'bg-orange-500' : 'bg-green-600 dark:bg-green-800'}>
                              {Math.abs(Math.round(entry.difference)).toLocaleString()}
                            </Badge>
                          </TableCell>
                           {canEdit && index === 0 && (
                            <TableCell className="text-right" rowSpan={ruling.rulingEntries.length}>
                               <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/>Delete Ruling</DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>This will permanently delete the ruling for reel <strong>{ruling.reelNo}</strong> and revert the stock changes.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteRuling(ruling)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                     })
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 8 : 7}
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

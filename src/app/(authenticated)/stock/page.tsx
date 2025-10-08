'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, MoreVertical, Edit, Trash2, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useMemo, useCallback } from 'react';
import { Reel, PaperType, User as AppUser, Stock } from '@/lib/types';
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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, writeBatch, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const StockWizard = ({
  paperTypes,
  loadingPaperTypes,
  onSave,
  onClose,
  isSaving,
}: {
  paperTypes: PaperType[] | null;
  loadingPaperTypes: boolean;
  onSave: (batchData: { paperType: PaperType, totalReels: number, totalWeight: number }) => void;
  onClose: () => void;
  isSaving: boolean;
}) => {
  const [step, setStep] = useState(1);
  const [paperTypeId, setPaperTypeId] = useState<string | null>(null);
  const [totalReels, setTotalReels] = useState<number>(0);
  const [totalWeight, setTotalWeight] = useState<number>(0);

  const selectedPaperType = useMemo(() => paperTypes?.find(p => p.id === paperTypeId), [paperTypeId, paperTypes]);

  const handleNext = () => {
    if (step === 1 && selectedPaperType) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };
  
  const handleSave = () => {
    if(selectedPaperType && totalReels > 0 && totalWeight > 0) {
      onSave({ paperType: selectedPaperType, totalReels, totalWeight });
    }
  };
  
  const reset = () => {
    setStep(1);
    setPaperTypeId(null);
    setTotalReels(0);
    setTotalWeight(0);
  };

  return (
    <>
      <div className="p-4 space-y-4 overflow-y-auto flex-grow">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Step 1: Select Paper Details</h3>
             <div className="space-y-2">
              <Label htmlFor="paperTypeId">Paper Type</Label>
              <Select onValueChange={setPaperTypeId} disabled={loadingPaperTypes} value={paperTypeId || ''}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select a paper type" /></SelectTrigger>
                <SelectContent>
                  {paperTypes?.map((paper) => (<SelectItem key={paper.id} value={paper.id}>{paper.paperName} ({paper.gsm}gsm, {paper.length}cm)</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {selectedPaperType && (
                 <div className="p-3 bg-muted/50 rounded-md text-sm">
                    <p><strong>GSM:</strong> {selectedPaperType.gsm}</p>
                    <p><strong>Length:</strong> {selectedPaperType.length} cm</p>
                 </div>
            )}
          </div>
        )}
        {step === 2 && selectedPaperType && (
            <div className="space-y-4">
                <h3 className="font-semibold">Step 2: Enter Batch Details</h3>
                 <div className="p-3 bg-muted/50 rounded-md text-sm">
                    <p><strong>Paper:</strong> {selectedPaperType.paperName}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="totalReels">Total Number of Reels</Label>
                        <Input id="totalReels" type="number" value={totalReels || ''} onChange={e => setTotalReels(parseInt(e.target.value) || 0)} className="h-11" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="totalWeight">Total Reel Weight (kg)</Label>
                        <Input id="totalWeight" type="number" value={totalWeight || ''} onChange={e => setTotalWeight(parseFloat(e.target.value) || 0)} className="h-11" />
                    </div>
                 </div>
                 <div className="p-3 bg-muted/50 rounded-md text-sm">
                    <p>This will generate <strong>{totalReels}</strong> individual reel entries.</p>
                 </div>
            </div>
        )}
      </div>
      <div className="p-4 border-t sticky bottom-0 bg-background z-10 flex justify-between gap-2">
        <div>
          {step === 2 && <Button variant="outline" onClick={handleBack} disabled={isSaving} className="h-11">Back</Button>}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={isSaving} className="h-11">Cancel</Button>
          {step === 1 && <Button onClick={handleNext} disabled={!selectedPaperType} className="h-11">Next</Button>}
          {step === 2 && <Button onClick={handleSave} disabled={isSaving || totalReels <= 0 || totalWeight <= 0} className="h-11">{isSaving ? 'Saving...' : 'Add Stock'}</Button>}
        </div>
      </div>
    </>
  );
}

export default function StockPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const stockQuery = useMemoFirebase(() => firestore ? collection(firestore, 'stock') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: stock, isLoading: loadingStock } = useCollection<Stock>(stockQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const canEdit = useMemo(() => currentUser?.role === 'Admin', [currentUser]);

  const closeModal = useCallback(() => { setIsModalOpen(false); }, []);

  const handleSaveStock = async ({ paperType, totalReels, totalWeight }: { paperType: PaperType, totalReels: number, totalWeight: number }) => {
    if (!firestore || !user) return;
    setIsSaving(true);
    
    const stockDocRef = doc(firestore, 'stock', paperType.id);

    try {
      await runTransaction(firestore, async (transaction) => {
        const stockDoc = await transaction.get(stockDocRef);
        if (!stockDoc.exists()) {
          const newStock: Omit<Stock, 'id'> = {
            paperTypeId: paperType.id,
            length: paperType.length,
            gsm: paperType.gsm,
            totalWeight: totalWeight,
            numberOfReels: totalReels,
            date: serverTimestamp() as any,
          };
          transaction.set(stockDocRef, newStock);
        } else {
          const currentWeight = stockDoc.data().totalWeight || 0;
          const currentReels = stockDoc.data().numberOfReels || 0;
          transaction.update(stockDocRef, {
            totalWeight: currentWeight + totalWeight,
            numberOfReels: currentReels + totalReels,
          });
        }
      });
        
      toast({ title: 'Stock Added', description: `${totalReels} reels have been added to the stock for ${paperType.paperName}.` });
      closeModal();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || "Could not add stock." });
    } finally {
        setIsSaving(false);
    }
  };
  
  const filteredStock = useMemo(() => {
    if (!stock) return [];
    return stock.filter(item => {
        const paperType = paperTypes?.find(p => p.id === item.paperTypeId);
        if (!paperType) return false;
        return paperType.paperName.toLowerCase().includes(searchFilter.toLowerCase());
    }).sort((a,b) => {
        const paperA = paperTypes?.find(p => p.id === a.paperTypeId)?.paperName || '';
        const paperB = paperTypes?.find(p => p.id === b.paperTypeId)?.paperName || '';
        return paperA.localeCompare(paperB);
    });
  }, [stock, searchFilter, paperTypes]);

  const getPaperTypeName = (paperTypeId: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  
  const stockStatusVariant = (reels: number): "default" | "destructive" => {
    return reels > 0 ? 'default' : 'destructive';
  };
  
  const stockStatusColor = (reels: number): string => {
    return reels > 0 ? 'bg-green-600 dark:bg-green-800' : '';
  }

  const modalProps = { paperTypes, loadingPaperTypes, onSave: handleSaveStock, onClose: closeModal, isSaving };

  const renderTrigger = () => (
    <Button onClick={() => setIsModalOpen(true)} className="h-11 w-full sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />Add Stock
    </Button>
  );
  
  const renderFilters = () => (
    <div className="space-y-2">
      <Label htmlFor='stock-search'>Search by Paper Name</Label>
      <Input id="stock-search" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Type a paper name..." className="h-11" />
    </div>
  );

  return (
    <>
      <PageHeader
        title="📦 Stock Management"
        description="Input paper stock and track real-time availability."
      >
        {canEdit && (
          isMobile ? (
            <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
              <SheetTrigger asChild>{renderTrigger()}</SheetTrigger>
              <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Add New Stock</SheetTitle>
                  <SheetDescription>Follow the steps to add new stock.</SheetDescription>
                </SheetHeader>
                <StockWizard {...modalProps} />
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>{renderTrigger()}</DialogTrigger>
              <DialogContent className="p-0 max-w-lg max-h-[90vh] flex flex-col">
                 <DialogHeader className="p-6 pb-0">
                  <DialogTitle>Add New Stock</DialogTitle>
                  <DialogDescription>Follow the steps to add new stock.</DialogDescription>
                </DialogHeader>
                <StockWizard {...modalProps} />
              </DialogContent>
            </Dialog>
          )
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Stock List</CardTitle>
          <CardDescription>A real-time list of all paper stock.</CardDescription>
            <div className="pt-4">
              {renderFilters()}
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper Name</TableHead>
                  <TableHead>Size (cm)</TableHead>
                  <TableHead>GSM</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Reels</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStock || loadingPaperTypes ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading stock...</TableCell></TableRow>
                ) : filteredStock && filteredStock.length > 0 ? (
                  filteredStock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-nowrap">{getPaperTypeName(item.paperTypeId)}</TableCell>
                      <TableCell>{item.length}</TableCell>
                      <TableCell>{item.gsm}</TableCell>
                      <TableCell>{item.totalWeight.toFixed(2)}</TableCell>
                       <TableCell>
                        <Badge variant={stockStatusVariant(item.numberOfReels)} className={stockStatusColor(item.numberOfReels)}>
                          {item.numberOfReels}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No stock found for the selected filter.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

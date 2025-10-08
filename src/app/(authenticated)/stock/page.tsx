
'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
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
import { useState, useEffect, useMemo } from 'react';
import { Stock, PaperType, User as AppUser } from '@/lib/types';
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, useUser, useDoc, deleteDocumentNonBlockingById, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export default function StockPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const stockQuery = useMemoFirebase(() => {
    if (isLoadingCurrentUser || !currentUser || currentUser.role === 'Operator') {
      return null;
    }
    return collection(firestore, 'stock');
  }, [firestore, currentUser, isLoadingCurrentUser]);
  
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: stock, isLoading: loadingStock } = useCollection<Stock>(stockQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [newStockItem, setNewStockItem] = useState<Partial<Stock>>({
    numberOfReels: 1,
    totalWeight: 0,
  });
  
  const canEdit = useMemo(() => {
    if (isLoadingCurrentUser || !currentUser) return false;
    return currentUser.role === 'Admin' || currentUser.role === 'Member';
  }, [currentUser, isLoadingCurrentUser]);

  const openModal = (stockItem?: Stock) => {
    if (stockItem) {
      setEditingStock(stockItem);
      setNewStockItem(stockItem);
    } else {
      setEditingStock(null);
      setNewStockItem({ numberOfReels: 1, totalWeight: 0 });
    }
    setIsModalOpen(true);
  }
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStock(null);
  }

  const handleSelectPaper = (paperTypeId: string) => {
    const selectedPaper = paperTypes?.find((p) => p.id === paperTypeId);
    if (selectedPaper) {
      setNewStockItem({
        ...newStockItem,
        paperTypeId: selectedPaper.id,
        gsm: selectedPaper.gsm,
        length: selectedPaper.length,
      });
    }
  };

  const handleSaveStock = () => {
    if (!firestore || !newStockItem.paperTypeId || !newStockItem.totalWeight || !newStockItem.numberOfReels) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all fields.' });
      return;
    }
    setIsSaving(true);
    
    const dataToSave = {
      paperTypeId: newStockItem.paperTypeId,
      gsm: newStockItem.gsm,
      length: newStockItem.length,
      totalWeight: newStockItem.totalWeight,
      numberOfReels: newStockItem.numberOfReels,
    };

    if (editingStock) {
      const docRef = doc(firestore, 'stock', editingStock.id);
      updateDocumentNonBlocking(docRef, dataToSave);
      toast({ title: 'Stock Updated' });
    } else {
      const stockToAdd = { ...dataToSave, date: serverTimestamp() };
      const stockCollection = collection(firestore, 'stock');
      addDocumentNonBlocking(stockCollection, stockToAdd);
      toast({ title: 'Stock Added' });
    }
    
    setIsSaving(false);
    closeModal();
  };
  
  const handleDeleteStock = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlockingById(firestore, 'stock', id);
    toast({ title: 'Stock Entry Deleted' });
  };

  const getPaperTypeName = (paperTypeId?: string) => {
    return paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  }

  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return 'N/A';
  }

  const ModalContent = () => (
    <>
      <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paper-type">Paper Type</Label>
          <Select value={newStockItem.paperTypeId} onValueChange={handleSelectPaper} disabled={loadingPaperTypes}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select a paper type" /></SelectTrigger>
            <SelectContent>
              {paperTypes?.map((paper) => (<SelectItem key={paper.id} value={paper.id}>{paper.paperName}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="gsm">GSM</Label><Input id="gsm" value={newStockItem.gsm || ''} readOnly disabled className="h-11" /></div>
          <div className="space-y-2"><Label htmlFor="length">Length (cm)</Label><Input id="length" value={newStockItem.length || ''} readOnly disabled className="h-11" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="total-weight">Total Weight (kg)</Label>
            <Input id="total-weight" type="number" value={newStockItem.totalWeight || ''} onChange={(e) => setNewStockItem({ ...newStockItem, totalWeight: parseFloat(e.target.value) || 0 })} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reels">Number of Reels</Label>
            <Input id="reels" type="number" value={newStockItem.numberOfReels || ''} onChange={(e) => setNewStockItem({ ...newStockItem, numberOfReels: parseInt(e.target.value) || 0 })} className="h-11" />
          </div>
        </div>
      </div>
      <DialogFooter className="mt-auto pt-4 border-t sticky bottom-0 bg-background z-10 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
         <Button variant="outline" onClick={closeModal} disabled={isSaving} className="h-11 w-full sm:w-auto">Cancel</Button>
        <Button onClick={handleSaveStock} disabled={isSaving} className="h-11 w-full sm:w-auto">
          {isSaving ? 'Saving...' : 'Save Stock'}
        </Button>
      </DialogFooter>
    </>
  );

  if (isLoadingCurrentUser) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="text-lg text-muted-foreground">Loading Stock...</div>
        </div>
    )
  }

  if (currentUser?.role === 'Operator') {
      return (
        <>
            <PageHeader title="Stock Management" description="Track and manage your paper stock in real-time." />
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
                <CardContent><p>Only Admins and Members can manage stock.</p></CardContent>
            </Card>
        </>
      )
  }

  return (
    <>
      <PageHeader
        title="Stock Management"
        description="Track and manage your paper stock in real-time."
      >
        {canEdit && (
          isMobile ? (
            <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
              <SheetTrigger asChild>
                <Button onClick={() => openModal()}><PlusCircle className="mr-2 h-4 w-4" />Add Stock</Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="p-0 flex flex-col h-[90svh]">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>{editingStock ? 'Edit' : 'Add New'} Stock</SheetTitle>
                  <SheetDescription>Enter the details of the paper stock.</SheetDescription>
                </SheetHeader>
                <ModalContent />
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openModal()}><PlusCircle className="mr-2 h-4 w-4" />Add Stock</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{editingStock ? 'Edit' : 'Add New'} Stock</DialogTitle>
                  <DialogDescription>Enter the details of the paper stock.</DialogDescription>
                </DialogHeader>
                <ModalContent />
              </DialogContent>
            </Dialog>
          )
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
          <CardDescription>A list of all paper stock available.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:hidden">
            {loadingStock ? (
              <p className="text-center text-muted-foreground">Loading stock...</p>
            ) : stock && stock.length > 0 ? (
              stock.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{getPaperTypeName(item.paperTypeId)}</CardTitle>
                          <CardDescription>{formatDate(item.date)}</CardDescription>
                        </div>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="-mt-2 -mr-2"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => openModal(item)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this stock entry.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteStock(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t">
                        <span>GSM:</span><span className="font-medium text-foreground text-right">{item.gsm}</span>
                        <span>Length:</span><span className="font-medium text-foreground text-right">{item.length} cm</span>
                        <span>Weight:</span><span className="font-medium text-foreground text-right">{item.totalWeight?.toLocaleString()} kg</span>
                        <span>Reels:</span><span className="font-medium text-foreground text-right">{item.numberOfReels}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground h-24 flex items-center justify-center">No stock added yet.</p>
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Paper Type</TableHead>
                  <TableHead>GSM</TableHead>
                  <TableHead>Length (cm)</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>No. of Reels</TableHead>
                  {canEdit && <TableHead className="w-[50px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStock ? (
                  <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="h-24 text-center">Loading stock...</TableCell></TableRow>
                ) : stock && stock.length > 0 ? (
                  stock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(item.date)}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{getPaperTypeName(item.paperTypeId)}</TableCell>
                      <TableCell>{item.gsm}</TableCell>
                      <TableCell>{item.length}</TableCell>
                      <TableCell>{item.totalWeight?.toLocaleString()}</TableCell>
                      <TableCell>{item.numberOfReels}</TableCell>
                      {canEdit && (
                         <TableCell className="text-right">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => openModal(item)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this stock entry.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteStock(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                         </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="h-24 text-center text-muted-foreground">No stock added yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

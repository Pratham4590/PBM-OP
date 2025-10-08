
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
  DialogClose,
} from '@/components/ui/dialog';
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

export default function StockPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  const isOperator = useMemo(() => currentUser?.role === 'Operator', [currentUser]);

  const stockQuery = useMemoFirebase(() => {
    if (isLoadingCurrentUser || !firestore || isOperator) {
      return null;
    }
    return collection(firestore, 'stock');
  }, [firestore, isLoadingCurrentUser, isOperator]);
  
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: stock, isLoading: loadingStock } = useCollection<Stock>(stockQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [newStockItem, setNewStockItem] = useState<Partial<Stock>>({
    numberOfReels: 1,
    totalWeight: 0,
  });
  
  const canEdit = useMemo(() => {
    if (isLoadingCurrentUser || !currentUser) return false;
    return currentUser.role === 'Admin' || currentUser.role === 'Member';
  }, [currentUser, isLoadingCurrentUser]);

  useEffect(() => {
    if (isModalOpen && editingStock) {
      setNewStockItem(editingStock);
    } else if (isModalOpen && !editingStock) {
      setNewStockItem({ numberOfReels: 1, totalWeight: 0 });
    }
  }, [isModalOpen, editingStock]);

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
    
    setIsModalOpen(false);
    setEditingStock(null);
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

  if (isLoadingCurrentUser) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="text-lg text-muted-foreground">Loading Stock...</div>
        </div>
    )
  }

  if (isOperator) {
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
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openModal()}><PlusCircle className="mr-2 h-4 w-4" />Add Stock</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStock ? 'Edit' : 'Add New'} Stock</DialogTitle>
              <DialogDescription>Enter the details of the paper stock.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="paper-type">Paper Type</Label>
                <Select value={newStockItem.paperTypeId} onValueChange={handleSelectPaper} disabled={loadingPaperTypes}>
                  <SelectTrigger><SelectValue placeholder="Select a paper type" /></SelectTrigger>
                  <SelectContent>
                    {paperTypes?.map((paper) => (<SelectItem key={paper.id} value={paper.id}>{paper.paperName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="gsm">GSM</Label><Input id="gsm" value={newStockItem.gsm || ''} readOnly disabled/></div>
                <div className="space-y-2"><Label htmlFor="length">Length (cm)</Label><Input id="length" value={newStockItem.length || ''} readOnly disabled/></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total-weight">Total Weight (kg)</Label>
                  <Input id="total-weight" type="number" value={newStockItem.totalWeight || ''} onChange={(e) => setNewStockItem({ ...newStockItem, totalWeight: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reels">Number of Reels</Label>
                  <Input id="reels" type="number" value={newStockItem.numberOfReels || ''} onChange={(e) => setNewStockItem({ ...newStockItem, numberOfReels: parseInt(e.target.value) || 0 })}/>
                </div>
              </div>
            </div>
            <DialogFooter>
               <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSaveStock}>Save Stock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
          <CardDescription>A list of all paper stock available.</CardDescription>
        </CardHeader>
        <CardContent>
           {/* Mobile View: Card List */}
          <div className="grid gap-4 sm:hidden">
            {loadingStock ? (
              <p className="text-center text-muted-foreground">Loading stock...</p>
            ) : stock && stock.length > 0 ? (
              stock.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <p className="font-medium">{getPaperTypeName(item.paperTypeId)}</p>
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
                     <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                        <span>GSM:</span><span className="font-medium text-foreground">{item.gsm}</span>
                        <span>Length:</span><span className="font-medium text-foreground">{item.length} cm</span>
                        <span>Weight:</span><span className="font-medium text-foreground">{item.totalWeight?.toLocaleString()} kg</span>
                        <span>Reels:</span><span className="font-medium text-foreground">{item.numberOfReels}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground h-24 flex items-center justify-center">No stock added yet.</p>
            )}
          </div>

          {/* Desktop View: Table */}
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

    
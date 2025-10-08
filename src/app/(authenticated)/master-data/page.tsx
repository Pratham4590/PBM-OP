'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMemo, useState } from 'react';
import { PaperType, ItemType, User as AppUser } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, useUser, useDoc, deleteDocumentNonBlockingById, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';


export default function MasterDataPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);

  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);

  const { data: paperTypes, isLoading: loadingPaper } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes, isLoading: loadingItems } = useCollection<ItemType>(itemTypesQuery);

  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  const [editingPaperType, setEditingPaperType] = useState<PaperType | null>(null);
  const [editingItemType, setEditingItemType] = useState<ItemType | null>(null);

  const [newPaperType, setNewPaperType] = useState<Partial<PaperType>>({ paperName: '', gsm: undefined, length: undefined });
  const [newItemType, setNewItemType] = useState<Partial<ItemType>>({ itemName: '', shortCode: '' });

  const canEdit = useMemo(() => {
    if (isLoadingCurrentUser || !currentUser) return false;
    return currentUser.role === 'Admin';
  }, [currentUser, isLoadingCurrentUser]);
  
  // --- Paper Type Handlers ---
  const openPaperModal = (paper?: PaperType) => {
    if (paper) {
      setEditingPaperType(paper);
      setNewPaperType(paper);
    } else {
      setEditingPaperType(null);
      setNewPaperType({ paperName: '', gsm: undefined, length: undefined });
    }
    setIsPaperModalOpen(true);
  }
  
  const handleClosePaperModal = () => {
    setIsPaperModalOpen(false);
  }

  const handleSavePaperType = () => {
    if (!firestore || !newPaperType.paperName || !newPaperType.gsm || !newPaperType.length) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all fields.' });
      return;
    }
    const dataToSave = {
        paperName: newPaperType.paperName,
        gsm: newPaperType.gsm,
        length: newPaperType.length,
    }

    if (editingPaperType) {
      const docRef = doc(firestore, 'paperTypes', editingPaperType.id);
      updateDocumentNonBlocking(docRef, dataToSave);
      toast({ title: 'Paper Type Updated' });
    } else {
      const collectionRef = collection(firestore, 'paperTypes');
      addDocumentNonBlocking(collectionRef, dataToSave);
      toast({ title: 'Paper Type Added' });
    }
    handleClosePaperModal();
  };
  
  const handleDeletePaperType = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlockingById(firestore, 'paperTypes', id);
    toast({ title: 'Paper Type Deleted' });
  }

  // --- Item Type Handlers ---
  const openItemModal = (item?: ItemType) => {
    if (item) {
      setEditingItemType(item);
      setNewItemType(item);
    } else {
      setEditingItemType(null);
      setNewItemType({ itemName: '', shortCode: '' });
    }
    setIsItemModalOpen(true);
  }
  
  const handleCloseItemModal = () => {
    setIsItemModalOpen(false);
  }

  const handleSaveItemType = () => {
    if (!firestore || !newItemType.itemName || !newItemType.shortCode) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all fields.' });
      return;
    }
     const dataToSave = {
        itemName: newItemType.itemName,
        shortCode: newItemType.shortCode,
    }

    if (editingItemType) {
      const docRef = doc(firestore, 'itemTypes', editingItemType.id);
      updateDocumentNonBlocking(docRef, dataToSave);
      toast({ title: 'Item Type Updated' });
    } else {
      const collectionRef = collection(firestore, 'itemTypes');
      addDocumentNonBlocking(collectionRef, dataToSave);
      toast({ title: 'Item Type Added' });
    }
    handleCloseItemModal();
  };
  
  const handleDeleteItemType = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlockingById(firestore, 'itemTypes', id);
    toast({ title: 'Item Type Deleted' });
  }

  const PaperModalContent = () => (
    <>
      <div className="p-4 space-y-4 overflow-y-auto max-h-[80vh]">
        <div className="space-y-2">
          <Label htmlFor="paper-name">Paper Name</Label>
          <Input id="paper-name" value={newPaperType.paperName || ''} onChange={(e) => setNewPaperType({ ...newPaperType, paperName: e.target.value })} placeholder="e.g., JK Maplitho" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paper-gsm">GSM (Grams per Square Meter)</Label>
          <Input id="paper-gsm" type="number" value={newPaperType.gsm || ''} onChange={(e) => setNewPaperType({ ...newPaperType, gsm: parseFloat(e.target.value) || 0 })} placeholder="e.g., 58" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paper-length">Length (cm)</Label>
          <Input id="paper-length" type="number" value={newPaperType.length || ''} onChange={(e) => setNewPaperType({ ...newPaperType, length: parseFloat(e.target.value) || 0 })} placeholder="e.g., 60" className="h-11" />
        </div>
      </div>
      <DialogFooter className="p-4 border-t sticky bottom-0 bg-background z-10 w-full">
        <Button variant="outline" onClick={handleClosePaperModal} className="h-11 w-full sm:w-auto">Cancel</Button>
        <Button onClick={handleSavePaperType} className="h-11 w-full sm:w-auto">Save Paper Type</Button>
      </DialogFooter>
    </>
  );

  const ItemModalContent = () => (
    <>
      <div className="p-4 space-y-4 overflow-y-auto max-h-[80vh]">
        <div className="space-y-2">
          <Label htmlFor="item-name">Item Name</Label>
          <Input id="item-name" value={newItemType.itemName || ''} onChange={(e) => setNewItemType({ ...newItemType, itemName: e.target.value })} placeholder="e.g., Ruled Notebook" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-shortCode">Short Code</Label>
          <Input id="item-shortCode" value={newItemType.shortCode || ''} onChange={(e) => setNewItemType({ ...newItemType, shortCode: e.target.value })} placeholder="e.g., RN01" className="h-11" />
        </div>
      </div>
      <DialogFooter className="p-4 border-t sticky bottom-0 bg-background z-10 w-full">
        <Button variant="outline" onClick={handleCloseItemModal} className="h-11 w-full sm:w-auto">Cancel</Button>
        <Button onClick={handleSaveItemType} className="h-11 w-full sm:w-auto">Save Item Type</Button>
      </DialogFooter>
    </>
  );


  return (
    <>
      <PageHeader
        title="Master Data"
        description="Manage reference data for paper, items, and more."
      >
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isMobile ? (
              <>
                <Sheet open={isPaperModalOpen} onOpenChange={setIsPaperModalOpen}>
                  <SheetTrigger asChild>
                    <Button className="w-full sm:w-auto h-11" onClick={() => openPaperModal()}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Paper Type
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
                    <SheetHeader className="p-4 border-b">
                      <SheetTitle>{editingPaperType ? 'Edit' : 'Add New'} Paper Type</SheetTitle>
                    </SheetHeader>
                    <PaperModalContent />
                  </SheetContent>
                </Sheet>
                <Sheet open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
                  <SheetTrigger asChild>
                    <Button className="w-full sm:w-auto h-11" onClick={() => openItemModal()}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Item Type
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
                    <SheetHeader className="p-4 border-b">
                      <SheetTitle>{editingItemType ? 'Edit' : 'Add New'} Item Type</SheetTitle>
                    </SheetHeader>
                    <ItemModalContent />
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <Dialog open={isPaperModalOpen} onOpenChange={setIsPaperModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto h-11" onClick={() => openPaperModal()}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Paper Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="p-0 max-w-lg">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle>{editingPaperType ? 'Edit' : 'Add New'} Paper Type</DialogTitle>
                    </DialogHeader>
                    <PaperModalContent />
                  </DialogContent>
                </Dialog>
                <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto h-11" onClick={() => openItemModal()}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Item Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="p-0 max-w-lg">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle>{editingItemType ? 'Edit' : 'Add New'} Item Type</DialogTitle>
                    </DialogHeader>
                    <ItemModalContent />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        )}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paper Name</TableHead>
                    <TableHead>GSM</TableHead>
                    <TableHead>Length (cm)</TableHead>
                    {canEdit && <TableHead className="w-[50px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPaper ? (
                    <TableRow><TableCell colSpan={canEdit ? 4 : 3} className="text-center h-24">Loading...</TableCell></TableRow>
                  ) : paperTypes && paperTypes.length > 0 ? (
                    paperTypes.map((paper) => (
                      <TableRow key={paper.id}>
                        <TableCell className="font-medium whitespace-nowrap">{paper.paperName}</TableCell>
                        <TableCell><Badge variant="outline">{paper.gsm}</Badge></TableCell>
                        <TableCell>{paper.length}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                             <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => openPaperModal(paper)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the paper type: <strong>{paper.paperName}</strong>.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeletePaperType(paper.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={canEdit ? 4 : 3} className="text-center h-24">No paper types found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Item Types</CardTitle>
            <CardDescription>
              Define the types of items produced (e.g., notebooks).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Short Code</TableHead>
                     {canEdit && <TableHead className="w-[50px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingItems ? (
                    <TableRow><TableCell colSpan={canEdit ? 3 : 2} className="text-center h-24">Loading...</TableCell></TableRow>
                  ) : itemTypes && itemTypes.length > 0 ? (
                    itemTypes.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium whitespace-nowrap">{item.itemName}</TableCell>
                        <TableCell>{item.shortCode}</TableCell>
                         {canEdit && (
                          <TableCell className="text-right">
                             <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => openItemModal(item)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the item type: <strong>{item.itemName}</strong>.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteItemType(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={canEdit ? 3 : 2} className="text-center h-24">No item types found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

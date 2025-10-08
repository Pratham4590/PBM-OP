
'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
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
import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const stockSchema = z.object({
  paperTypeId: z.string().min(1, { message: "Paper type is required." }),
  totalWeight: z.number().positive({ message: "Weight must be positive." }),
  numberOfReels: z.number().int().positive({ message: "Reels must be a positive whole number." }),
  gsm: z.number().optional(),
  length: z.number().optional(),
});

type StockFormData = z.infer<typeof stockSchema>;

const StockModalContent = ({
  paperTypes,
  loadingPaperTypes,
  onSave,
  onClose,
  isSaving,
  initialData,
}: {
  paperTypes: PaperType[] | null;
  loadingPaperTypes: boolean;
  onSave: (data: StockFormData) => void;
  onClose: () => void;
  isSaving: boolean;
  initialData?: Partial<Stock> | null;
}) => {
  
  const form = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      paperTypeId: initialData?.paperTypeId || '',
      totalWeight: initialData?.totalWeight || undefined,
      numberOfReels: initialData?.numberOfReels || undefined,
      gsm: initialData?.gsm || undefined,
      length: initialData?.length || undefined,
    }
  });

  const { control, handleSubmit, watch, setValue } = form;
  const paperTypeId = watch('paperTypeId');

  useEffect(() => {
    if (paperTypeId) {
      const selectedPaper = paperTypes?.find((p) => p.id === paperTypeId);
      if (selectedPaper) {
        setValue('gsm', selectedPaper.gsm);
        setValue('length', selectedPaper.length);
      }
    }
  }, [paperTypeId, paperTypes, setValue]);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSave)} className="flex flex-col h-full">
        <div className="p-4 space-y-4 overflow-y-auto flex-grow">
          <FormField
            control={control}
            name="paperTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paper Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPaperTypes}>
                  <FormControl>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select a paper type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paperTypes?.map((paper) => (<SelectItem key={paper.id} value={paper.id}>{paper.paperName}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
             <FormField
                control={control}
                name="gsm"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>GSM</FormLabel>
                    <FormControl>
                        <Input {...field} readOnly disabled className="h-11 bg-muted/50" />
                    </FormControl>
                </FormItem>
                )}
            />
            <FormField
                control={control}
                name="length"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Length (cm)</FormLabel>
                    <FormControl>
                        <Input {...field} readOnly disabled className="h-11 bg-muted/50" />
                    </FormControl>
                </FormItem>
                )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <FormField
                control={control}
                name="totalWeight"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Total Weight (kg)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-11" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={control}
                name="numberOfReels"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Number of Reels</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-11" />
                    </FormControl>
                     <FormMessage />
                </FormItem>
                )}
            />
          </div>
        </div>
        <div className="p-4 border-t sticky bottom-0 bg-background z-10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
           <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="h-11 w-full sm:w-auto">Cancel</Button>
          <Button type="submit" disabled={isSaving} className="h-11 w-full sm:w-auto">
            {isSaving ? 'Saving...' : 'Save Stock'}
          </Button>
        </div>
      </form>
    </Form>
  );
}


export default function StockPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const stockQuery = useMemoFirebase(() => {
    if (!firestore || isLoadingCurrentUser || !currentUser || !['Admin', 'Member'].includes(currentUser.role)) {
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
  
  const canEdit = useMemo(() => {
    if (isLoadingCurrentUser || !currentUser) return false;
    return currentUser.role === 'Admin';
  }, [currentUser, isLoadingCurrentUser]);

  const openModal = (stockItem?: Stock) => {
    setEditingStock(stockItem || null);
    setIsModalOpen(true);
  }
  
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingStock(null);
  }, []);

  const handleSaveStock = async (data: StockFormData) => {
    if (!firestore) return;
    setIsSaving(true);
    
    const selectedPaper = paperTypes?.find((p) => p.id === data.paperTypeId);
    if (!selectedPaper) {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid paper type selected.' });
        setIsSaving(false);
        return;
    }

    const dataToSave: Omit<Stock, 'id' | 'date'> = {
      paperTypeId: data.paperTypeId,
      gsm: selectedPaper.gsm,
      length: selectedPaper.length,
      totalWeight: data.totalWeight,
      numberOfReels: data.numberOfReels,
    };

    try {
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
      closeModal();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || "Could not save stock." });
    } finally {
      setIsSaving(false);
    }
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

  const modalProps = {
    paperTypes,
    loadingPaperTypes,
    onSave: handleSaveStock,
    onClose: closeModal,
    isSaving,
    initialData: editingStock
  };

  if (isLoadingCurrentUser) {
    return (
        <>
            <PageHeader title="Stock Management" description="Track and manage your paper stock in real-time." />
            <Card>
                <CardHeader>
                    <CardTitle>Loading...</CardTitle>
                    <CardDescription>Checking permissions...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-48 w-full flex items-center justify-center">
                        <p className="text-muted-foreground">Please wait</p>
                    </div>
                </CardContent>
            </Card>
        </>
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
                <Button onClick={() => openModal()} className="h-11"><PlusCircle className="mr-2 h-4 w-4" />Add Stock</Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>{editingStock ? 'Edit' : 'Add New'} Stock</SheetTitle>
                </SheetHeader>
                <StockModalContent {...modalProps} />
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openModal()} className="h-11"><PlusCircle className="mr-2 h-4 w-4" />Add Stock</Button>
              </DialogTrigger>
              <DialogContent className="p-0 max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle>{editingStock ? 'Edit' : 'Add New'} Stock</DialogTitle>
                  <DialogDescription>Enter the details of the paper stock.</DialogDescription>
                </DialogHeader>
                <StockModalContent {...modalProps} />
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
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
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
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
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
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
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

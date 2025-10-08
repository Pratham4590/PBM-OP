
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
import { Reel, PaperType, User as AppUser } from '@/lib/types';
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
import { collection, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const ReelWizard = ({
  paperTypes,
  loadingPaperTypes,
  onSave,
  onClose,
  isSaving,
  user,
}: {
  paperTypes: PaperType[] | null;
  loadingPaperTypes: boolean;
  onSave: (batchData: { paperType: PaperType, totalReels: number, totalWeight: number }) => void;
  onClose: () => void;
  isSaving: boolean;
  user: AppUser | null;
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
                    <p>Calculated weight per reel: <strong>{(totalWeight / (totalReels || 1)).toFixed(2)} kg</strong></p>
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
          {step === 2 && <Button onClick={handleSave} disabled={isSaving || totalReels <= 0 || totalWeight <= 0} className="h-11">{isSaving ? 'Saving...' : 'Create Reels'}</Button>}
        </div>
      </div>
    </>
  );
}

export default function ReelsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const reelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [filterPaper, setFilterPaper] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReelNo, setFilterReelNo] = useState('');

  const canEdit = useMemo(() => currentUser?.role === 'Admin' || currentUser?.role === 'Member', [currentUser]);

  const closeModal = useCallback(() => { setIsModalOpen(false); }, []);

  const handleSaveBatch = async ({ paperType, totalReels, totalWeight }: { paperType: PaperType, totalReels: number, totalWeight: number }) => {
    if (!firestore || !user) return;
    setIsSaving(true);
    
    const weightPerReel = totalWeight / totalReels;
    
    try {
        const batch = writeBatch(firestore);
        
        for (let i = 0; i < totalReels; i++) {
            const reelDocRef = doc(collection(firestore, 'reels'));
            const newReel: Omit<Reel, 'id'> = {
                reelNo: `${paperType.paperName.substring(0,3).toUpperCase()}-${Date.now()}-${i+1}`,
                paperTypeId: paperType.id,
                length: paperType.length,
                gsm: paperType.gsm,
                weight: weightPerReel,
                status: 'Available',
                createdAt: serverTimestamp() as any,
                createdBy: user.uid,
            };
            batch.set(reelDocRef, newReel);
        }
        
        await batch.commit();
        toast({ title: 'Reels Created', description: `${totalReels} reels have been added to the list.` });
        closeModal();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || "Could not create reels." });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDeleteReel = (id: string) => {
    if (!firestore || !canEdit) return;
    const docRef = doc(firestore, 'reels', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Reel Deleted' });
  };
  
  const filteredReels = useMemo(() => {
    return reels?.filter(reel => {
        const paperMatch = filterPaper === 'all' || reel.paperTypeId === filterPaper;
        const statusMatch = filterStatus === 'all' || reel.status === filterStatus;
        const reelNoMatch = filterReelNo === '' || reel.reelNo.toLowerCase().includes(filterReelNo.toLowerCase());
        return paperMatch && statusMatch && reelNoMatch;
    }).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [reels, filterPaper, filterStatus, filterReelNo]);

  const getPaperTypeName = (paperTypeId: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  
  const statusVariant = (status: Reel['status']): "default" | "secondary" | "outline" => {
    switch (status) {
        case 'Available': return 'default';
        case 'Partially Used': return 'secondary';
        case 'Finished': return 'outline';
    }
  };

  const modalProps = { paperTypes, loadingPaperTypes, onSave: handleSaveBatch, onClose: closeModal, isSaving, user: currentUser };

  const renderTrigger = () => (
    <Button onClick={() => setIsModalOpen(true)} className="h-11">
      <PlusCircle className="mr-2 h-4 w-4" />Add Reel Batch
    </Button>
  );
  
  const renderFilters = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Filter by Paper</Label>
           <Select value={filterPaper} onValueChange={setFilterPaper}>
              <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Filter by paper type..." />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Paper Types</SelectItem>
                  {paperTypes?.map(p => <SelectItem key={p.id} value={p.id}>{p.paperName}</SelectItem>)}
              </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
           <Label>Filter by Status</Label>
           <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Partially Used">Partially Used</SelectItem>
                    <SelectItem value="Finished">Finished</SelectItem>
                </SelectContent>
            </Select>
        </div>
         <div className="space-y-2">
            <Label htmlFor='reel-no-filter'>Filter by Reel No.</Label>
            <Input id="reel-no-filter" value={filterReelNo} onChange={(e) => setFilterReelNo(e.target.value)} placeholder="Type a reel number..." className="h-11" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Reel Management"
        description="Add and track individual paper reels from stock."
      >
        {canEdit && (
          isMobile ? (
            <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
              <SheetTrigger asChild>{renderTrigger()}</SheetTrigger>
              <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Add New Reel Batch</SheetTitle>
                  <SheetDescription>Follow the steps to add new reels.</SheetDescription>
                </SheetHeader>
                <ReelWizard {...modalProps} />
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>{renderTrigger()}</DialogTrigger>
              <DialogContent className="p-0 max-w-lg max-h-[90vh] flex flex-col">
                 <DialogHeader className="p-6 pb-0">
                  <DialogTitle>Add New Reel Batch</DialogTitle>
                  <DialogDescription>Follow the steps to add new reels.</DialogDescription>
                </DialogHeader>
                <ReelWizard {...modalProps} />
              </DialogContent>
            </Dialog>
          )
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Reel List</CardTitle>
          <CardDescription>A list of all individual reels in stock or used.</CardDescription>
            <div className="pt-4">
              {isMobile ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-screen max-w-sm p-4">
                    {renderFilters()}
                  </PopoverContent>
                </Popover>
              ) : renderFilters()}
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reel No.</TableHead>
                  <TableHead>Paper</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-[50px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReels ? (
                  <TableRow><TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center">Loading reels...</TableCell></TableRow>
                ) : filteredReels && filteredReels.length > 0 ? (
                  filteredReels.map((reel) => (
                    <TableRow key={reel.id}>
                      <TableCell className="font-medium whitespace-nowrap">{reel.reelNo}</TableCell>
                      <TableCell className="whitespace-nowrap">{getPaperTypeName(reel.paperTypeId)}</TableCell>
                      <TableCell>{reel.weight.toFixed(2)}</TableCell>
                      <TableCell><Badge variant={statusVariant(reel.status)}>{reel.status}</Badge></TableCell>
                      {canEdit && (
                         <TableCell className="text-right">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete reel <strong>{reel.reelNo}</strong>. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteReel(reel.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                         </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center text-muted-foreground">No reels found for the selected filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

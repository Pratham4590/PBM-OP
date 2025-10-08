
'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, Trash2, MoreVertical, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import {
  Ruling,
  Reel,
  PaperType,
  ItemType,
  Program,
  User as AppUser,
} from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc, writeBatch } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';


const RulingForm = ({
  availableReels,
  programs,
  itemTypes,
  paperTypes,
  onSave,
  onClose,
  isSaving
}: {
  availableReels: Reel[] | null,
  programs: Program[] | null,
  itemTypes: ItemType[] | null,
  paperTypes: PaperType[] | null,
  onSave: (ruling: Partial<Ruling>) => void,
  onClose: () => void,
  isSaving: boolean
}) => {
  const [ruling, setRuling] = useState<Partial<Ruling>>({});
  const { toast } = useToast();
  
  const selectedReel = useMemo(() => availableReels?.find(r => r.id === ruling.reelId), [ruling.reelId, availableReels]);
  const selectedProgram = useMemo(() => programs?.find(p => p.id === ruling.programId), [ruling.programId, programs]);

  useEffect(() => {
    if (selectedReel) {
      setRuling(prev => ({ ...prev, paperTypeId: selectedReel.paperTypeId, startWeight: selectedReel.weight, reelNo: selectedReel.reelNo }));
    }
  }, [selectedReel]);
  
  useEffect(() => {
    if (selectedProgram) {
      setRuling(prev => ({ ...prev, itemTypeId: selectedProgram.itemTypeId, cutoff: selectedProgram.cutoff }));
    }
  }, [selectedProgram]);

  const calculation = useMemo(() => {
    const defaultValues = { theoreticalSheets: 0, difference: 0 };
    if (!selectedReel || !ruling.cutoff || !ruling.sheetsRuled) return defaultValues;
    
    const reamWeight = (selectedReel.length * ruling.cutoff * selectedReel.gsm) / 20000;
    
    if (reamWeight <= 0 || !ruling.startWeight) return defaultValues;

    const theoreticalSheets = (ruling.startWeight * 500) / reamWeight;
    const difference = ruling.sheetsRuled - theoreticalSheets;
    return { theoreticalSheets, difference };
  }, [selectedReel, ruling]);

  const handleSave = () => {
    if (!ruling.reelId || !ruling.itemTypeId || !ruling.cutoff || !ruling.sheetsRuled || ruling.endWeight === undefined) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all fields.' });
      return;
    }
    if (ruling.startWeight && ruling.endWeight > ruling.startWeight) {
      toast({ variant: 'destructive', title: 'Invalid Weight', description: 'End weight cannot be greater than start weight.' });
      return;
    }
    onSave({
      ...ruling,
      theoreticalSheets: calculation.theoreticalSheets,
      difference: calculation.difference,
    });
  };

  const getPaperTypeName = (paperTypeId?: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';

  return (
    <>
      <div className="p-4 space-y-4 overflow-y-auto flex-grow max-h-[75vh]">
          <div className="space-y-2">
            <Label>Select Reel</Label>
            <Select onValueChange={(value) => setRuling(prev => ({...prev, reelId: value}))}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select a reel" /></SelectTrigger>
              <SelectContent>
                {availableReels?.map(reel => (
                  <SelectItem key={reel.id} value={reel.id}>{reel.reelNo} ({getPaperTypeName(reel.paperTypeId)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           {selectedReel && (
             <div className="p-3 bg-muted/50 rounded-md text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                <span>Paper:</span> <span className="text-right font-medium">{getPaperTypeName(selectedReel.paperTypeId)}</span>
                <span>Weight:</span> <span className="text-right font-medium">{selectedReel.weight.toFixed(2)} kg</span>
                <span>Length:</span> <span className="text-right font-medium">{selectedReel.length} cm</span>
                <span>GSM:</span> <span className="text-right font-medium">{selectedReel.gsm}</span>
             </div>
           )}
          <div className="space-y-2">
              <Label>Program (Optional)</Label>
              <Select onValueChange={(value) => setRuling(prev => ({...prev, programId: value === 'none' ? undefined : value}))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select a program" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Program</SelectItem>
                  {programs?.map(prog => (
                    <SelectItem key={prog.id} value={prog.id}>{prog.brand} - {itemTypes?.find(i => i.id === prog.itemTypeId)?.itemName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Type</Label>
                <Select value={ruling.itemTypeId} onValueChange={(value) => setRuling(prev => ({...prev, itemTypeId: value}))} disabled={!!selectedProgram}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {itemTypes?.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.itemName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cutoff (cm)</Label>
                <Input type="number" value={ruling.cutoff || ''} onChange={e => setRuling(prev => ({...prev, cutoff: parseFloat(e.target.value)}))} disabled={!!selectedProgram} className="h-11" />
              </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sheets Ruled</Label>
                <Input type="number" value={ruling.sheetsRuled || ''} onChange={e => setRuling(prev => ({...prev, sheetsRuled: parseInt(e.target.value)}))} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>End Weight (kg)</Label>
                <Input type="number" value={ruling.endWeight || ''} onChange={e => setRuling(prev => ({...prev, endWeight: parseFloat(e.target.value)}))} className="h-11" />
              </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-md text-sm grid grid-cols-2 gap-x-4 gap-y-1">
              <span>Theoretical Sheets:</span> <span className="text-right font-medium">{(calculation.theoreticalSheets || 0).toFixed(0)}</span>
              <span>Difference:</span> 
              <span className="text-right font-medium">
                  <Badge variant={calculation.difference >= 0 ? 'default' : 'destructive'} className={calculation.difference >= 0 ? 'bg-green-600' : ''}>
                    {(calculation.difference || 0).toFixed(0)}
                  </Badge>
              </span>
          </div>
      </div>
      <DialogFooter className="p-4 border-t sticky bottom-0 bg-background z-10">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Ruling'}</Button>
      </DialogFooter>
    </>
  );
}

export default function RulingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser } = useDoc<AppUser>(currentUserDocRef);

  const rulingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'rulings') : null, [firestore]);
  const reelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);
  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);

  const { data: rulings, isLoading: loadingRulings } = useCollection<Ruling>(rulingsQuery);
  const { data: reels } = useCollection<Reel>(reelsQuery);
  const { data: paperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes } = useCollection<ItemType>(itemTypesQuery);
  const { data: programs } = useCollection<Program>(programsQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canDelete = useMemo(() => currentUser?.role === 'Admin' || currentUser?.role === 'Member', [currentUser]);

  const availableReels = useMemo(() => reels?.filter(r => r.status !== 'Finished'), [reels]);

  const resetForm = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSaveRuling = async (rulingData: Partial<Ruling>) => {
    if (!firestore || !user || !rulingData.reelId) return;
    setIsSaving(true);
    
    try {
      const batch = writeBatch(firestore);

      const rulingDocRef = doc(collection(firestore, 'rulings'));
      batch.set(rulingDocRef, { ...rulingData, createdBy: user.uid, date: serverTimestamp() });
      
      const reelDocRef = doc(firestore, 'reels', rulingData.reelId);
      const newWeight = rulingData.endWeight!;
      const newStatus: Reel['status'] = newWeight > 0 ? 'In Use' : 'Finished';
      batch.update(reelDocRef, { weight: newWeight, status: newStatus });

      await batch.commit();

      toast({ title: 'Ruling Saved', description: `Reel ${rulingData.reelNo} has been updated.` });
      resetForm();
    } catch (error: any) {
      console.error("Ruling save failed:", error);
      toast({ variant: 'destructive', title: 'Operation Failed', description: error.message || "Could not save the ruling." });
    } finally {
      setIsSaving(false);
    }
  }

  const handleDeleteRuling = (rulingId: string) => {
    if (!firestore || !canDelete) return;
    const docRef = doc(firestore, 'rulings', rulingId);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Ruling Deleted' });
  }
  
  const getPaperTypeName = (paperTypeId?: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  const getItemTypeName = (itemTypeId?: string) => itemTypes?.find(i => i.id === itemTypeId)?.itemName || 'N/A';
  const getProgramInfo = (programId?: string) => programs?.find(p => p.id === programId);
  
  const ModalTrigger = () => (
    <Button onClick={() => setIsModalOpen(true)} className="h-11">
      <PlusCircle className="mr-2 h-4 w-4" />
      Add Ruling
    </Button>
  );

  const formProps = {
    availableReels,
    programs,
    itemTypes,
    paperTypes,
    onSave: handleSaveRuling,
    onClose: resetForm,
    isSaving,
  };

  return (
    <>
      <PageHeader
        title="Reel Ruling"
        description="Log ruling entries for available reels."
      >
        {isMobile ? (
          <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
            <SheetTrigger asChild>
              <ModalTrigger />
            </SheetTrigger>
            <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Add Reel Ruling</SheetTitle>
              </SheetHeader>
              <RulingForm {...formProps} />
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <ModalTrigger />
            </DialogTrigger>
            <DialogContent className="p-0 max-w-lg max-h-[90vh] flex flex-col">
              <DialogHeader className="p-6 pb-4">
                <DialogTitle>Add Reel Ruling</DialogTitle>
              </DialogHeader>
              <RulingForm {...formProps} />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Rulings</CardTitle>
            <CardDescription>A list of all individual ruling entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRulings ? (
                 <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">Loading rulings...</p>
                </div>
            ) : rulings && rulings.length > 0 ? (
                <Accordion type="single" collapsible className="w-full" defaultValue={`ruling-${rulings[0].id}`}>
                {rulings.sort((a,b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis()).map(ruling => (
                    <AccordionItem value={`ruling-${ruling.id}`} key={ruling.id}>
                       <div className="flex items-center w-full">
                         <AccordionTrigger className="flex-1">
                            <div className="flex justify-between items-center w-full pr-4 text-left">
                                <span className="font-semibold">Reel: {ruling.reelNo}</span>
                                <span className="text-sm text-muted-foreground">{(ruling.date as Timestamp)?.toDate().toLocaleDateString()}</span>
                            </div>
                         </AccordionTrigger>
                        {canDelete && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="ml-2">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this ruling entry.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteRuling(ruling.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                       </div>
                        <AccordionContent>
                           <div className="overflow-x-auto">
                               <Table>
                                 <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Ruled</TableHead>
                                        <TableHead>Sheets Ruled</TableHead>
                                        <TableHead>Program</TableHead>
                                        <TableHead className="text-right">Difference</TableHead>
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                        <TableRow>
                                            <TableCell className="whitespace-nowrap">{getItemTypeName(ruling.itemTypeId)}</TableCell>
                                            <TableCell>{ruling.sheetsRuled.toLocaleString()}</TableCell>
                                            <TableCell className="whitespace-nowrap">{getProgramInfo(ruling.programId)?.brand || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={ruling.difference >= 0 ? 'default' : 'destructive'} className={ruling.difference >= 0 ? 'bg-green-600' : ''}>
                                                    {Math.round(ruling.difference || 0).toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                 </TableBody>
                               </Table>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
            ) : (
                <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">No reel rulings have been logged yet.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

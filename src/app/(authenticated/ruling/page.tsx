
'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, Trash2, ArrowLeft, Settings } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useMemo } from 'react';
import {
  Reel,
  PaperType,
  ItemType,
  Program,
  User as AppUser,
  RulingEntry,
  StatusLog,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch, updateDoc } from 'firebase/firestore';

import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';


const initialRulingEntry: RulingEntry = {
  itemTypeId: '',
  sheetsRuled: 0,
  cutoff: 0,
  theoreticalSheets: 0,
  difference: 0,
  status: 'In Progress',
};


const RulingForm = ({
    selectedReel,
    itemTypes,
    programs,
    onSave,
    onCancel,
    isSaving,
    onStatusChange,
    canChangeStatus,
}: {
    selectedReel: Reel,
    itemTypes: ItemType[] | null,
    programs: Program[] | null,
    onSave: (entries: Partial<RulingEntry>[]) => void,
    onCancel: () => void,
    isSaving: boolean,
    onStatusChange: (newStatus: Reel['status']) => void,
    canChangeStatus: boolean,
}) => {
  const [rulingEntries, setRulingEntries] = useState<Partial<RulingEntry>[]>([{}]);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<Reel['status']>(selectedReel.status);
  
  const handleRulingEntryChange = (index: number, field: keyof RulingEntry, value: any) => {
    const newEntries = [...rulingEntries];
    const entry = { ...newEntries[index] };
    (entry as any)[field] = value;
    
    if (field === 'programId' && value !== 'none') {
        const program = programs?.find(p => p.id === value);
        if(program) {
            entry.itemTypeId = program.itemTypeId;
            entry.cutoff = program.cutoff;
        }
    }
    
    newEntries[index] = entry;
    setRulingEntries(newEntries);
  };

  const addRulingEntry = () => {
    setRulingEntries([...rulingEntries, {}]);
  };

  const removeRulingEntry = (index: number) => {
    const newEntries = rulingEntries.filter((_, i) => i !== index);
    setRulingEntries(newEntries);
  };

  const totalSheetsRuled = useMemo(() => {
    return rulingEntries.reduce((acc, entry) => acc + (entry.sheetsRuled || 0), 0);
  }, [rulingEntries]);

  const calculateRulingValues = (entry: Partial<RulingEntry>) => {
    if (!selectedReel || !entry.cutoff || !entry.sheetsRuled || !entry.itemTypeId) {
      return { theoreticalSheets: 0, difference: 0 };
    }
    const { initialSheets, weight } = selectedReel;
    if (initialSheets <= 0) return { theoreticalSheets: 0, difference: 0 };
    
    const weightPerSheet = weight / initialSheets;
    const rulingWeight = (entry.sheetsRuled || 0) * weightPerSheet;

    const { length, gsm } = selectedReel;
    const reamWeight = (length * entry.cutoff * gsm) / 20000;
    if (reamWeight <= 0) return { theoreticalSheets: 0, difference: 0 };

    const theoreticalSheets = (rulingWeight * 500) / reamWeight;
    const difference = entry.sheetsRuled - theoreticalSheets;

    return { theoreticalSheets, difference };
  };

  const remainingSheets = (selectedReel.availableSheets ?? selectedReel.initialSheets) - totalSheetsRuled;
  const isRulingDisabled = selectedReel.status === 'Finished' || selectedReel.status === 'Hold';

  const handleStatusSave = () => {
    onStatusChange(newStatus);
    setIsStatusModalOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
            <CardTitle>Step 3: Add Ruling Entries</CardTitle>
            <CardDescription>Log one or more rulings for Reel <span className="font-bold">{selectedReel?.reelNo}</span>.</CardDescription>
            </div>
            {canChangeStatus && (
                <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Settings className="h-5 w-5" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Change Reel Status</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Select value={newStatus} onValueChange={(val: Reel['status']) => setNewStatus(val)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="In Use">In Use</SelectItem>
                                    <SelectItem value="Finished">Finished</SelectItem>
                                    <SelectItem value="Hold">Hold</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleStatusSave}>Save Status</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
         <div className="p-4 bg-muted/50 rounded-lg mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between"><span>Status:</span> <Badge variant={selectedReel.status === 'Available' ? 'default' : 'secondary'} className={`${selectedReel.status === 'Available' ? 'bg-green-600' : selectedReel.status === 'In Use' ? 'bg-blue-500' : selectedReel.status === 'Finished' ? 'bg-red-600' : 'bg-orange-500'}`}>{selectedReel.status}</Badge></div>
            <div className="flex justify-between"><span>Start Sheets:</span> <span className="font-bold">{selectedReel.initialSheets?.toLocaleString() || 'N/A'}</span></div>
            <div className="flex justify-between col-span-2 sm:col-span-1"><span>Available Sheets:</span> <span className="font-bold">{remainingSheets.toLocaleString()}</span></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" className="w-full space-y-4" defaultValue={['ruling-0']}>
          {rulingEntries.map((entry, index) => {
             const calculation = calculateRulingValues(entry);
            return (
            <AccordionItem value={`ruling-${index}`} key={index} className="border-2 rounded-lg p-0">
                <div className="flex items-center justify-between p-4">
                    <AccordionTrigger className="font-semibold text-lg flex-1">
                        Ruling #{index + 1}
                    </AccordionTrigger>
                    {rulingEntries.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeRulingEntry(index)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>}
                </div>
                <AccordionContent className="px-4 pb-4 space-y-4">
                     <div className="space-y-2">
                        <Label>Program (Optional)</Label>
                        <Select onValueChange={(value) => handleRulingEntryChange(index, 'programId', value === 'none' ? undefined : value)} disabled={isRulingDisabled}>
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
                            <Select value={entry.itemTypeId} onValueChange={(value) => handleRulingEntryChange(index, 'itemTypeId', value)} disabled={!!entry.programId || isRulingDisabled}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Select item" /></SelectTrigger>
                            <SelectContent>
                                {itemTypes?.map(item => (<SelectItem key={item.id} value={item.id}>{item.itemName}</SelectItem>))}
                            </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Cutoff (cm)</Label>
                            <Input type="number" value={entry.cutoff || ''} onChange={e => handleRulingEntryChange(index, 'cutoff', parseFloat(e.target.value))} disabled={!!entry.programId || isRulingDisabled} className="h-11" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Sheets Ruled</Label>
                            <Input type="number" value={entry.sheetsRuled || ''} onChange={e => handleRulingEntryChange(index, 'sheetsRuled', parseInt(e.target.value))} disabled={isRulingDisabled} className="h-11" />
                        </div>
                         <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={entry.status || 'In Progress'} onValueChange={(value) => handleRulingEntryChange(index, 'status', value)} disabled={isRulingDisabled}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Select status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Half Finished">Half Finished</SelectItem>
                                <SelectItem value="Finished">Finished</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="p-3 bg-muted/50 rounded-md text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                        <span>Theoretical Sheets:</span> <span className="text-right font-medium">{calculation.theoreticalSheets.toFixed(0)}</span>
                        <span>Difference:</span> 
                        <span className="text-right font-medium">
                            <Badge variant={calculation.difference >= 0 ? 'default' : 'destructive'} className={calculation.difference >= 0 ? 'bg-green-600' : ''}>
                                {Math.round(calculation.difference || 0).toLocaleString()}
                            </Badge>
                        </span>
                    </div>
                </AccordionContent>
            </AccordionItem>
          )})}
        </Accordion>
        
        {!isRulingDisabled && <Button variant="outline" onClick={addRulingEntry}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Another Ruling
        </Button>}
        
      </CardContent>
      <CardFooter className="sticky bottom-0 bg-background/95 py-4 border-t flex gap-2">
        <Button variant="outline" onClick={onCancel} className="w-full h-12" disabled={isSaving}>Cancel</Button>
        <Button onClick={() => onSave(rulingEntries)} className="w-full h-12" disabled={isSaving || isRulingDisabled}>{isSaving ? 'Saving...' : 'Save All Rulings'}</Button>
      </CardFooter>
    </Card>
  )
}


export default function RulingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedPaperTypeId, setSelectedPaperTypeId] = useState<string | null>(null);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const reelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);
  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);

  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);
  const { data: programs, isLoading: loadingPrograms } = useCollection<Program>(programsQuery);
  
  const canChangeStatus = useMemo(() => currentUser?.role === 'Admin', [currentUser]);

  const availableReels = useMemo(() => {
    if (!reels || !selectedPaperTypeId) return [];
    return reels.filter(r => r.paperTypeId === selectedPaperTypeId && r.status !== 'Finished');
  }, [reels, selectedPaperTypeId]);
  
  const handlePaperTypeSelect = (paperTypeId: string) => {
    setSelectedPaperTypeId(paperTypeId);
    setStep(2);
  };
  
  const handleReelSelect = (reel: Reel) => {
    setSelectedReel(reel);
    setStep(3);
  };

  const calculateInitialSheets = (reel: Reel): number => {
    // This is a placeholder. A real calculation would be more complex.
    // For now, let's assume a standard ream weight and calculate from there.
    // A more accurate formula would need paper density, roll diameter etc.
    // Ream Weight = (Length x Width x GSM) / 20000
    // For a roll, it's more complex. We'll use a simplified version for now.
    // Theoretical sheets = (Total Weight * 500) / Ream Weight
    // Let's assume a standard width (cutoff) for this paper type if not available.
    const standardCutoff = 80; // in cm, a guess
    const reamWeight = (reel.length * standardCutoff * reel.gsm) / 20000;
    if (reamWeight <= 0) return 0;
    return Math.floor((reel.weight * 500) / reamWeight);
  };
  
  const handleSave = async (rulingEntries: Partial<RulingEntry>[]) => {
    if (!firestore || !user || !selectedReel) return;
    
    if (rulingEntries.some(e => !e.itemTypeId || !e.cutoff || !e.sheetsRuled)) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields for each ruling entry.' });
      return;
    }
    const totalSheetsRuled = rulingEntries.reduce((sum, entry) => sum + (entry.sheetsRuled || 0), 0);
    const availableSheets = selectedReel.availableSheets ?? selectedReel.initialSheets;
    if (totalSheetsRuled > availableSheets) {
        toast({ variant: 'destructive', title: 'Insufficient Stock', description: `Cannot rule ${totalSheetsRuled.toLocaleString()} sheets. Only ${availableSheets.toLocaleString()} are available.`});
        return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);
      const initialSheets = selectedReel.initialSheets || calculateInitialSheets(selectedReel);
      const weightPerSheet = selectedReel.weight / initialSheets;
      
      const finalRulingEntries = rulingEntries.map(entry => {
        const rulingWeight = (entry.sheetsRuled || 0) * weightPerSheet;
        const reamWeight = (selectedReel.length * (entry.cutoff || 0) * selectedReel.gsm) / 20000;
        const theoreticalSheets = reamWeight > 0 ? (rulingWeight * 500) / reamWeight : 0;
        const difference = (entry.sheetsRuled || 0) - theoreticalSheets;

        return {
          ...initialRulingEntry,
          ...entry,
          theoreticalSheets,
          difference,
        } as RulingEntry;
      });

      const rulingData = {
        date: serverTimestamp(),
        reelId: selectedReel.id,
        reelNo: selectedReel.reelNo,
        paperTypeId: selectedReel.paperTypeId,
        startWeight: selectedReel.weight,
        rulingEntries: finalRulingEntries,
        totalSheetsRuled,
        createdBy: user.uid,
      };

      const rulingDocRef = doc(collection(firestore, 'rulings'));
      batch.set(rulingDocRef, rulingData);

      const reelDocRef = doc(firestore, 'reels', selectedReel.id);
      const newAvailableSheets = availableSheets - totalSheetsRuled;
      const newStatus: Reel['status'] = newAvailableSheets < 100 ? 'Finished' : 'In Use';
      batch.update(reelDocRef, { 
        availableSheets: newAvailableSheets, 
        status: newStatus,
        initialSheets: selectedReel.initialSheets || initialSheets, // Save initial sheets if not present
      });
      
      await batch.commit();
      
      toast({ title: "Ruling Saved Successfully", description: `Reel ${selectedReel.reelNo} has been updated.` });
      router.push('/dashboard');

    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message || 'Could not save ruling.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualStatusChange = async (newStatus: Reel['status']) => {
    if (!firestore || !user || !selectedReel || !canChangeStatus) return;

    const statusLog: Omit<StatusLog, 'id'> = {
        reelId: selectedReel.id,
        oldStatus: selectedReel.status,
        newStatus: newStatus,
        changedBy: user.uid,
        timestamp: serverTimestamp(),
    };

    try {
        const reelDocRef = doc(firestore, 'reels', selectedReel.id);
        await updateDoc(reelDocRef, { status: newStatus });
        
        const statusLogCollectionRef = collection(firestore, 'statusLogs');
        addDocumentNonBlocking(statusLogCollectionRef, statusLog);

        setSelectedReel(prev => prev ? { ...prev, status: newStatus } : null);

        toast({ title: 'Status Updated', description: `Reel status changed to ${newStatus}`});
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };
  
  const resetAll = () => {
    setStep(1);
    setSelectedPaperTypeId(null);
    setSelectedReel(null);
    setIsSaving(false);
  }

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Select Paper Type</CardTitle>
        <CardDescription>Choose the paper that the reel is made of.</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingPaperTypes ? <Skeleton className="h-10 w-full" /> : (
            <Select onValueChange={handlePaperTypeSelect}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select a paper type..." /></SelectTrigger>
                <SelectContent>
                {paperTypes?.map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.paperName} - {pt.gsm}gsm - {pt.length}cm</SelectItem>
                ))}
                </SelectContent>
            </Select>
        )}
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Select Reel</CardTitle>
        <CardDescription>
          Choose the specific reel you are ruling. Only available reels for the selected paper are shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loadingReels ? <Skeleton className="h-24 w-full" /> : 
        availableReels.length > 0 ? availableReels.map(reel => (
          <div key={reel.id} onClick={() => handleReelSelect(reel)} className="p-4 border rounded-lg cursor-pointer hover:bg-muted flex justify-between items-center">
            <div>
              <p className="font-semibold">{reel.reelNo}</p>
              <p className="text-sm text-muted-foreground">{reel.weight.toFixed(2)} kg available</p>
            </div>
            <Badge variant={reel.status === 'Available' ? 'default' : 'secondary'} className={reel.status === 'Available' ? 'bg-green-600' : 'bg-blue-500'}>{reel.status}</Badge>
          </div>
        )) : <p className="text-muted-foreground text-center p-4">No available reels for this paper type.</p>}
      </CardContent>
    </Card>
  );
  

  return (
    <>
      <PageHeader
        title="Reel Ruling"
        description="Log ruling entries for available reels."
      >
        <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : router.back()}>
            <ArrowLeft />
        </Button>
      </PageHeader>
      
      <div className="space-y-6 pb-24">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && selectedReel && (
          <RulingForm
            selectedReel={selectedReel}
            itemTypes={itemTypes}
            programs={programs}
            onSave={handleSave}
            onCancel={resetAll}
            isSaving={isSaving}
            onStatusChange={handleManualStatusChange}
            canChangeStatus={canChangeStatus}
          />
        )}
      </div>
    </>
  );
}

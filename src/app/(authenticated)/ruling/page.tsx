
'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, Trash2, ChevronDown, ArrowLeft } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
  RulingEntry,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc, writeBatch, addDoc } from 'firebase/firestore';

import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const initialRulingEntry: RulingEntry = {
  itemTypeId: '',
  sheetsRuled: 0,
  cutoff: 0,
  theoreticalSheets: 0,
  difference: 0,
  status: 'In Progress',
};


export default function RulingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedPaperTypeId, setSelectedPaperTypeId] = useState<string | null>(null);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [rulingEntries, setRulingEntries] = useState<Partial<RulingEntry>[]>([{}]);
  const [endWeight, setEndWeight] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const reelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);
  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);

  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);
  const { data: programs, isLoading: loadingPrograms } = useCollection<Program>(programsQuery);
  
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
    setEndWeight(reel.weight);
    setStep(3);
  };
  
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

  const calculateRulingValues = (entry: Partial<RulingEntry>, rulingWeight: number) => {
    if (!selectedReel || !entry.cutoff || !entry.sheetsRuled) {
      return { theoreticalSheets: 0, difference: 0 };
    }
    const { length, gsm } = selectedReel;
    const reamWeight = (length * entry.cutoff * gsm) / 20000;
    if (reamWeight <= 0) return { theoreticalSheets: 0, difference: 0 };

    const theoreticalSheets = (rulingWeight * 500) / reamWeight;
    const difference = entry.sheetsRuled - theoreticalSheets;

    return { theoreticalSheets, difference };
  };

  const totalSheetsRuled = useMemo(() => {
    return rulingEntries.reduce((acc, entry) => acc + (entry.sheetsRuled || 0), 0);
  }, [rulingEntries]);

  const weightUsedPerEntry = useMemo(() => {
    if (!selectedReel) return 0;
    const totalWeightUsed = selectedReel.weight - endWeight;
    if (totalWeightUsed <= 0 || totalSheetsRuled <= 0) return 0;

    return totalWeightUsed / totalSheetsRuled;
  }, [selectedReel, endWeight, totalSheetsRuled]);

  const handleSave = async () => {
    if (!firestore || !user || !selectedReel) return;

    if (endWeight > selectedReel.weight) {
      toast({ variant: 'destructive', title: 'Invalid Weight', description: 'End weight cannot be greater than the reel\'s start weight.' });
      return;
    }
    if (rulingEntries.some(e => !e.itemTypeId || !e.cutoff || !e.sheetsRuled)) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all fields for each ruling entry.' });
      return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);

      const finalRulingEntries = rulingEntries.map(entry => {
        const rulingWeight = (entry.sheetsRuled || 0) * weightUsedPerEntry;
        const { theoreticalSheets, difference } = calculateRulingValues(entry, rulingWeight);
        return {
          ...initialRulingEntry,
          ...entry,
          theoreticalSheets,
          difference,
        } as RulingEntry;
      });

      const rulingData: Omit<Ruling, 'id'> = {
        date: serverTimestamp(),
        reelId: selectedReel.id,
        reelNo: selectedReel.reelNo,
        paperTypeId: selectedReel.paperTypeId,
        startWeight: selectedReel.weight,
        endWeight,
        rulingEntries: finalRulingEntries,
        totalSheetsRuled,
        createdBy: user.uid,
      };

      const rulingDocRef = doc(collection(firestore, 'rulings'));
      batch.set(rulingDocRef, rulingData);

      const reelDocRef = doc(firestore, 'reels', selectedReel.id);
      const newStatus: Reel['status'] = endWeight > 0 ? 'In Use' : 'Finished';
      batch.update(reelDocRef, { weight: endWeight, status: newStatus });
      
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
            <Badge variant={reel.status === 'Available' ? 'default' : 'secondary'} className={reel.status === 'Available' ? 'bg-green-600' : ''}>{reel.status}</Badge>
          </div>
        )) : <p className="text-muted-foreground text-center p-4">No available reels for this paper type.</p>}
      </CardContent>
    </Card>
  );
  
  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Add Ruling Entries</CardTitle>
        <div className="flex justify-between items-center">
            <CardDescription>Log one or more rulings for Reel <span className="font-bold">{selectedReel?.reelNo}</span>.</CardDescription>
            <Badge variant="outline">{selectedReel?.weight.toFixed(2)} kg</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" className="w-full space-y-4" defaultValue={['ruling-0']}>
          {rulingEntries.map((entry, index) => {
            const rulingWeight = (entry.sheetsRuled || 0) * weightUsedPerEntry;
            const calculated = calculateRulingValues(entry, rulingWeight);

            return (
            <AccordionItem value={`ruling-${index}`} key={index} className="border-2 rounded-lg p-0">
                <div className="flex items-center justify-between p-4">
                    <AccordionTrigger className="font-semibold text-lg flex-1">
                        Ruling #{index + 1}
                    </AccordionTrigger>
                    <Button variant="ghost" size="icon" onClick={() => removeRulingEntry(index)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                </div>
                <AccordionContent className="px-4 pb-4 space-y-4">
                     <div className="space-y-2">
                        <Label>Program (Optional)</Label>
                        <Select onValueChange={(value) => handleRulingEntryChange(index, 'programId', value === 'none' ? undefined : value)}>
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
                            <Select value={entry.itemTypeId} onValueChange={(value) => handleRulingEntryChange(index, 'itemTypeId', value)} disabled={!!entry.programId}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Select item" /></SelectTrigger>
                            <SelectContent>
                                {itemTypes?.map(item => (<SelectItem key={item.id} value={item.id}>{item.itemName}</SelectItem>))}
                            </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Cutoff (cm)</Label>
                            <Input type="number" value={entry.cutoff || ''} onChange={e => handleRulingEntryChange(index, 'cutoff', parseFloat(e.target.value))} disabled={!!entry.programId} className="h-11" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Sheets Ruled</Label>
                            <Input type="number" value={entry.sheetsRuled || ''} onChange={e => handleRulingEntryChange(index, 'sheetsRuled', parseInt(e.target.value))} className="h-11" />
                        </div>
                         <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={entry.status || 'In Progress'} onValueChange={(value) => handleRulingEntryChange(index, 'status', value)}>
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
                        <span>Theoretical Sheets:</span> <span className="text-right font-medium">{calculated.theoreticalSheets.toFixed(0)}</span>
                        <span>Difference:</span> 
                        <span className="text-right font-medium">
                            <Badge variant={calculated.difference >= 0 ? 'default' : 'destructive'} className={calculated.difference >= 0 ? 'bg-green-600' : ''}>
                                {Math.round(calculated.difference || 0).toLocaleString()}
                            </Badge>
                        </span>
                    </div>
                </AccordionContent>
            </AccordionItem>
          )})}
        </Accordion>
        
        <Button variant="outline" onClick={addRulingEntry}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Another Ruling
        </Button>
        
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="end-weight" className="text-lg font-semibold">Final Reel Weight (kg)</Label>
          <Input id="end-weight" type="number" value={endWeight} onChange={e => setEndWeight(parseFloat(e.target.value))} placeholder="Enter final weight of the reel" className="h-11"/>
        </div>
      </CardContent>
      <CardFooter className="sticky bottom-0 bg-background/95 py-4 border-t flex gap-2">
        <Button variant="outline" onClick={resetAll} className="w-full h-12" disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} className="w-full h-12" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save All Rulings'}</Button>
      </CardFooter>
    </Card>
  );
  
  const resetAll = () => {
    setStep(1);
    setSelectedPaperTypeId(null);
    setSelectedReel(null);
    setRulingEntries([{}]);
    setEndWeight(0);
  }

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
        {step === 3 && renderStep3()}
      </div>
    </>
  );
}

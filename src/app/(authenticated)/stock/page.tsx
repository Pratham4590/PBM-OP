'use client';

import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
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
import { useState, useMemo, useCallback } from 'react';
import { Reel, PaperType, User as AppUser } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const StockForm = ({
  paperTypes,
  onSave,
  onClose,
  isSaving,
  editingReel
}: {
  paperTypes: PaperType[] | null,
  onSave: (reel: Partial<Reel>, reelCount: number) => void,
  onClose: () => void,
  isSaving: boolean,
  editingReel: Partial<Reel> | null
}) => {
  const [reelData, setReelData] = useState<Partial<Reel>>({});
  const [reelCount, setReelCount] = useState(1);
  const { toast } = useToast();
  
  useState(() => {
    if (editingReel) {
      setReelData(editingReel);
      setReelCount(1);
    } else {
      setReelData({ weight: undefined, reelNo: '', paperTypeId: '' });
    }
  });

  const selectedPaper = useMemo(() => paperTypes?.find(p => p.id === reelData.paperTypeId), [reelData.paperTypeId, paperTypes]);
  
  useState(() => {
    if (selectedPaper) {
      setReelData(prev => ({ ...prev, gsm: selectedPaper.gsm, length: selectedPaper.length }));
    }
  });


  const handleSave = () => {
    if (!reelData.paperTypeId || reelData.weight === undefined || reelData.weight <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Paper Type and a valid Weight are required."});
      return;
    }
    const dataToSave: Partial<Reel> = {
      ...reelData,
      gsm: selectedPaper!.gsm,
      length: selectedPaper!.length,
      status: reelData.weight > 0 ? 'Available' : 'Finished',
    };
    onSave(dataToSave, editingReel ? 1 : reelCount);
  };
  
  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="paper-type">Paper Type</Label>
          <Select
            value={reelData.paperTypeId}
            onValueChange={(value) => setReelData(prev => ({...prev, paperTypeId: value}))}
            disabled={!!editingReel}
          >
            <SelectTrigger id="paper-type" className="h-11"><SelectValue placeholder="Select paper" /></SelectTrigger>
            <SelectContent>
              {paperTypes?.map(p => <SelectItem key={p.id} value={p.id}>{p.paperName} ({p.gsm}gsm, {p.length}cm)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
         {selectedPaper && (
          <div className="p-3 bg-muted/50 rounded-md text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                <span>GSM:</span> <span className="text-right font-medium">{selectedPaper.gsm}</span>
                <span>Length:</span> <span className="text-right font-medium">{selectedPaper.length} cm</span>
          </div>
        )}
        {!editingReel && (
            <div className="space-y-2">
                <Label htmlFor="reel-no">Starting Reel Number (optional)</Label>
                <Input id="reel-no" value={reelData.reelNo || ''} onChange={(e) => setReelData(prev => ({...prev, reelNo: e.target.value}))} placeholder="e.g., R-101" className="h-11" />
                <p className="text-xs text-muted-foreground">If you enter a number, reels will be auto-numbered (e.g., R-101, R-102).</p>
            </div>
        )}
        {editingReel && reelData.reelNo && (
            <div className="space-y-2">
                <Label htmlFor="reel-no-edit">Reel Number</Label>
                <Input id="reel-no-edit" value={reelData.reelNo} onChange={(e) => setReelData(prev => ({...prev, reelNo: e.target.value}))} className="h-11" />
            </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input id="weight" type="number" inputMode="decimal" value={reelData.weight || ''} onChange={(e) => setReelData(prev => ({...prev, weight: parseFloat(e.target.value) || 0}))} className="h-11"/>
          </div>
          {!editingReel && (
            <div className="space-y-2">
              <Label htmlFor="reel-count">Number of Reels</Label>
              <Input id="reel-count" type="number" inputMode="numeric" value={reelCount} onChange={(e) => setReelCount(parseInt(e.target.value, 10) || 1)} className="h-11" />
            </div>
          )}
        </div>
         <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" placeholder="Any notes about this stock..." />
        </div>
      </div>
       <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full h-11" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="w-full h-11">{isSaving ? "Saving..." : (editingReel ? "Save Changes" : "Add Stock")}</Button>
      </DialogFooter>
    </>
  )
}

export default function StockPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReel, setEditingReel] = useState<Reel | null>(null);
  
  const [searchFilter, setSearchFilter] = useState('');

  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const reelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  
  const canEdit = useMemo(() => currentUser?.role === 'Admin' || currentUser?.role === 'Member', [currentUser]);

  const openDialog = (reel?: Reel) => {
    setEditingReel(reel || null);
    setIsDialogOpen(true);
  }

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingReel(null);
  }, []);

  const handleSaveStock = (reelData: Partial<Reel>, reelCount: number) => {
    if (!firestore || !user || !canEdit) return;
    setIsSaving(true);
    
    if (editingReel && editingReel.id) {
       const docRef = doc(firestore, 'reels', editingReel.id);
       updateDocumentNonBlocking(docRef, reelData);
       toast({ title: '✅ Reel Updated Successfully' });
    } else {
        const baseReelNumber = reelData.reelNo && /\d+$/.test(reelData.reelNo) ? parseInt(reelData.reelNo.match(/\d+$/)![0], 10) : null;
        const prefix = reelData.reelNo ? reelData.reelNo.replace(/\d+$/, '') : 'Reel-';

        for (let i = 0; i < reelCount; i++) {
            const newReelNo = baseReelNumber !== null ? `${prefix}${baseReelNumber + i}` : `${prefix}${Date.now() + i}`;
            const dataWithMeta = {
             ...reelData,
             reelNo: newReelNo,
             createdBy: user.uid,
             createdAt: serverTimestamp()
           }
           const collectionRef = collection(firestore, 'reels');
           addDocumentNonBlocking(collectionRef, dataWithMeta);
        }
       toast({ title: `✅ ${reelCount} ${reelCount > 1 ? 'Reels' : 'Reel'} Added Successfully` });
    }
    
    setIsSaving(false);
    closeDialog();
  };
  
  const aggregatedStock = useMemo(() => {
    if (!reels || !paperTypes) return [];
    
    const stockMap = new Map<string, { paper: PaperType, totalWeight: number, reelCount: number, status: Reel['status'][] }>();

    reels.forEach(reel => {
        let entry = stockMap.get(reel.paperTypeId);
        if (!entry) {
            const paper = paperTypes.find(p => p.id === reel.paperTypeId);
            if (!paper) return;
            entry = { paper, totalWeight: 0, reelCount: 0, status: [] };
        }
        
        entry.totalWeight += reel.weight;
        entry.reelCount += 1;
        if (!entry.status.includes(reel.status)) {
            entry.status.push(reel.status);
        }

        stockMap.set(reel.paperTypeId, entry);
    });

    const lowercasedFilter = searchFilter.toLowerCase();
    
    return Array.from(stockMap.values()).filter(item => {
        if (!searchFilter) return true;
        return item.paper.paperName.toLowerCase().includes(lowercasedFilter);
    }).sort((a,b) => a.paper.paperName.localeCompare(b.paper.paperName));

  }, [reels, paperTypes, searchFilter]);
  

  const isLoading = loadingReels || loadingPaperTypes;
  
  return (
    <div className="flex flex-col p-4 space-y-4">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold">Stock Management</h1>
            <p className="text-muted-foreground">Aggregated view of all paper stock.</p>
        </div>

        {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full h-12 text-base font-medium" onClick={() => openDialog()}>
                        <Plus className="mr-2 h-5 w-5" /> Add Stock
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm w-[95vw] rounded-2xl p-4">
                    <DialogHeader>
                        <DialogTitle>{editingReel ? 'Edit' : 'Add'} Stock</DialogTitle>
                    </DialogHeader>
                    <StockForm 
                        paperTypes={paperTypes}
                        onSave={handleSaveStock}
                        onClose={closeDialog}
                        isSaving={isSaving}
                        editingReel={editingReel}
                    />
                </DialogContent>
            </Dialog>
        )}
        
        <div className="relative">
            <Input 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                placeholder="Search by paper name..." 
                className="h-11 w-full"
            />
        </div>

        <main className="flex-1 space-y-4">
            {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="flex flex-col">
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-4 w-full" />
                        </CardContent>
                        <CardFooter>
                           <Skeleton className="h-8 w-full" />
                        </CardFooter>
                    </Card>
                ))
            ) : aggregatedStock.length > 0 ? (
                aggregatedStock.map((item) => (
                    <Card key={item.paper.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="truncate">{item.paper.paperName}</CardTitle>
                            <CardDescription>{item.paper.gsm}gsm, {item.paper.length}cm</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 flex-grow">
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Weight:</span>
                                <span className="font-medium">{item.totalWeight.toFixed(2)} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Reels:</span>
                                <span className="font-medium">{item.reelCount}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-1">
                           {item.status.map(s => (
                             <Badge key={s} variant={s === 'Available' ? 'default' : s === 'In Use' ? 'secondary' : 'outline'} className={s === 'Available' ? 'bg-green-600' : s === 'In Use' ? 'bg-amber-500' : ''}>{s}</Badge>
                           ))}
                        </CardFooter>
                    </Card>
                ))
            ) : (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">No stock found. { searchFilter ? "Try a different search." : "Add some reels to get started."}</p>
                </div>
            )}
        </main>
    </div>
  );
}

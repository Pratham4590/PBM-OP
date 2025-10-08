'use client';

import { Button } from '@/components/ui/button';
import { Plus, X, Edit, Trash2, Camera } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
  SheetFooter,
  SheetClose,
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (editingReel) {
      setReelData(editingReel);
      setReelCount(1);
    } else {
      setReelData({ weight: undefined, reelNo: '', paperTypeId: '' });
    }
  }, [editingReel]);

  const selectedPaper = useMemo(() => paperTypes?.find(p => p.id === reelData.paperTypeId), [reelData.paperTypeId, paperTypes]);
  
  useEffect(() => {
    if (selectedPaper) {
      setReelData(prev => ({ ...prev, gsm: selectedPaper.gsm, length: selectedPaper.length }));
    }
  }, [selectedPaper]);


  useEffect(() => {
    if (isCameraOpen) {
        const getCameraPermission = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({video: true});
            setHasCameraPermission(true);

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings.',
            });
          }
        };
        getCameraPermission();
    } else {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }
  }, [isCameraOpen, toast]);


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
      <div className="p-4 space-y-4 overflow-y-auto">
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-11">
                    <Camera className="mr-2 h-4 w-4" /> Use Camera to Scan Reel
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan Reel</DialogTitle>
                    <DialogDescription>Point the camera at the reel information.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4">
                   <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted />
                   {hasCameraPermission === false && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                                Please allow camera access in your browser to use this feature.
                            </AlertDescription>
                        </Alert>
                   )}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                    <Button>Capture</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>

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
       <SheetFooter className="p-4 border-t sticky bottom-0 bg-background z-10 w-full flex-row gap-2">
        <SheetClose asChild>
            <Button variant="outline" className="w-full h-11">Cancel</Button>
        </SheetClose>
        <Button onClick={handleSave} disabled={isSaving} className="w-full h-11">{isSaving ? "Saving..." : (editingReel ? "Save Changes" : "Add Stock")}</Button>
      </SheetFooter>
    </>
  )
}

export default function StockPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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

  const openSheet = (reel?: Reel) => {
    setEditingReel(reel || null);
    setIsSheetOpen(true);
  }

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    setEditingReel(null);
  }, []);

  const handleSaveStock = (reelData: Partial<Reel>, reelCount: number) => {
    if (!firestore || !user || !canEdit) return;
    setIsSaving(true);
    
    if (editingReel && editingReel.id) {
       const docRef = doc(firestore, 'reels', editingReel.id);
       updateDocumentNonBlocking(docRef, reelData);
       toast({ title: 'Reel Updated' });
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
       toast({ title: `${reelCount} ${reelCount > 1 ? 'Reels' : 'Reel'} Added` });
    }
    
    setIsSaving(false);
    closeSheet();
  };

  const handleDeleteReel = (id: string) => {
    if (!firestore || !canEdit) return;
    const docRef = doc(firestore, 'reels', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Reel Deleted' });
  };
  
  const filteredReels = useMemo(() => {
    if (!reels) return [];
    const lowercasedFilter = searchFilter.toLowerCase();
    return reels.filter(reel => {
        if (!searchFilter) return true;
        const paperType = paperTypes?.find(p => p.id === reel.paperTypeId);
        const paperNameMatch = paperType?.paperName.toLowerCase().includes(lowercasedFilter);
        const reelNoMatch = reel.reelNo.toLowerCase().includes(lowercasedFilter);
        return paperNameMatch || reelNoMatch;
    }).sort((a,b) => {
        if (!b.createdAt || !a.createdAt) return 0;
        if (!b.createdAt.toMillis || !a.createdAt.toMillis) return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  }, [reels, searchFilter, paperTypes]);

  const getPaperTypeName = (paperTypeId: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  
  const statusVariant = (status: Reel['status']): "default" | "secondary" | "outline" => {
    switch (status) {
        case 'Available': return 'default';
        case 'Partially Used': return 'secondary';
        case 'Finished': return 'outline';
    }
  };
   const statusColor = (status: Reel['status']): string => {
    switch (status) {
        case 'Available': return 'bg-green-600 dark:bg-green-800';
        case 'Partially Used': return 'bg-amber-500 dark:bg-amber-700';
        case 'Finished': return 'border-dashed';
    }
  };

  const isLoading = loadingReels || loadingPaperTypes;
  
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] sm:h-screen">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 p-4 border-b">
         <h1 className="text-2xl font-bold text-center mb-4">📦 Stock Management</h1>
         <div className="relative">
            <Input 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                placeholder="Search paper, reel no..." 
                className="h-11 w-full"
            />
         </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="flex flex-col">
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-4 w-full" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-8 w-20" />
                        </CardFooter>
                    </Card>
                ))
            ) : filteredReels.length > 0 ? (
                filteredReels.map((reel) => (
                    <Card key={reel.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="truncate">{getPaperTypeName(reel.paperTypeId)}</CardTitle>
                            <CardDescription>Reel No: {reel.reelNo}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 flex-grow">
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Weight:</span>
                                <span className="font-medium">{reel.weight.toFixed(2)} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">GSM:</span>
                                <span className="font-medium">{reel.gsm}</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Size:</span>
                                <span className="font-medium">{reel.length} cm</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between items-center">
                            <Badge variant={statusVariant(reel.status)} className={statusColor(reel.status)}>{reel.status}</Badge>
                            {canEdit && (
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openSheet(reel)}>
                                        <Edit className="h-4 w-4"/>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete reel <strong>{reel.reelNo}</strong>.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteReel(reel.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                ))
            ) : (
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-16">
                    <p className="text-muted-foreground">No stock found. { searchFilter ? "Try a different search." : "Add some stock to get started."}</p>
                </div>
            )}
        </div>
      </main>

       {canEdit && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
             <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-20" size="icon">
                <Plus className="h-6 w-6" />
                <span className="sr-only">Add Stock</span>
             </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>{editingReel ? 'Edit' : 'Add'} Stock</SheetTitle>
            </SheetHeader>
            <StockForm 
                paperTypes={paperTypes}
                onSave={handleSaveStock}
                onClose={closeSheet}
                isSaving={isSaving}
                editingReel={editingReel}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

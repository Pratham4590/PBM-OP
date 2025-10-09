'use client';

import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Camera, X, Upload } from 'lucide-react';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';


const ReelForm = ({
  paperTypes,
  onSave,
  onClose,
  isSaving,
  editingReel
}: {
  paperTypes: PaperType[] | null,
  onSave: (reel: Partial<Reel>) => void,
  onClose: () => void,
  isSaving: boolean,
  editingReel: Partial<Reel> | null
}) => {
  const [reelData, setReelData] = useState<Partial<Reel>>({});
  const { toast } = useToast();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (editingReel) {
      setReelData(editingReel);
    } else {
      setReelData({ weight: undefined, reelNo: '', paperTypeId: '', status: 'Available' });
    }
  }, [editingReel]);

  const selectedPaper = useMemo(() => paperTypes?.find(p => p.id === reelData.paperTypeId), [reelData.paperTypeId, paperTypes]);
  
  useEffect(() => {
    if (selectedPaper) {
      setReelData(prev => ({ ...prev, gsm: selectedPaper.gsm, length: selectedPaper.length }));
    }
  }, [selectedPaper]);


  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraOpen) {
        setImagePreview(null);
        const getCameraPermission = async () => {
          try {
            stream = await navigator.mediaDevices.getUserMedia({video: true});
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
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOpen, toast]);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSave = () => {
    if (!reelData.paperTypeId || !reelData.reelNo || reelData.weight === undefined || reelData.weight <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Paper Type, Reel No. and a valid Weight are required."});
      return;
    }
    const dataToSave: Partial<Reel> = {
      ...reelData,
      gsm: selectedPaper!.gsm,
      length: selectedPaper!.length,
      status: reelData.weight > 0 ? (reelData.status === 'Finished' ? 'Available' : reelData.status) : 'Finished',
    };
    onSave(dataToSave);
  };
  
  return (
    <>
      <div className="p-4 space-y-4 overflow-y-auto">
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-11">
                    <Camera className="mr-2 h-4 w-4" /> Scan Reel with AI
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan Reel</DialogTitle>
                    <DialogDescription>Point the camera at the reel's label or upload an image.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4">
                   <div className="w-full aspect-video rounded-md bg-muted relative">
                        <video ref={videoRef} className={`w-full h-full object-cover rounded-md ${imagePreview ? 'hidden' : ''}`} autoPlay muted playsInline />
                        {imagePreview && <Image src={imagePreview} alt="Reel preview" layout="fill" className="object-contain rounded-md" />}
                   </div>
                   {hasCameraPermission === false && !imagePreview && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                                Please allow camera access in your browser to use this feature.
                            </AlertDescription>
                        </Alert>
                   )}
                </div>
                 <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden"/>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                       <Upload className="mr-2 h-4 w-4" /> Gallery
                    </Button>
                    <Button className="w-full">Capture & Analyze</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="space-y-2">
          <Label htmlFor="paper-type">Paper Type</Label>
          <Select
            value={reelData.paperTypeId}
            onValueChange={(value) => setReelData(prev => ({...prev, paperTypeId: value}))}
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
        <div className="space-y-2">
            <Label htmlFor="reel-no">Reel Number</Label>
            <Input id="reel-no" value={reelData.reelNo || ''} onChange={(e) => setReelData(prev => ({...prev, reelNo: e.target.value}))} placeholder="e.g., R-101" className="h-11" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input id="weight" type="number" inputMode="decimal" value={reelData.weight || ''} onChange={(e) => setReelData(prev => ({...prev, weight: parseFloat(e.target.value) || 0}))} className="h-11"/>
        </div>
        
         <div className="space-y-2">
            <Label htmlFor="notes">Remarks (optional)</Label>
            <Textarea id="notes" placeholder="Any notes about this reel..." value={reelData.notes || ''} onChange={(e) => setReelData(prev => ({...prev, notes: e.target.value}))} />
        </div>
      </div>
       <SheetFooter className="p-4 border-t sticky bottom-0 bg-background z-10 w-full flex-row gap-2">
        <SheetClose asChild>
            <Button variant="outline" className="w-full h-11">Cancel</Button>
        </SheetClose>
        <Button onClick={handleSave} disabled={isSaving} className="w-full h-11">{isSaving ? "Saving..." : (editingReel ? "Save Changes" : "Add Reel")}</Button>
      </SheetFooter>
    </>
  )
}

export default function ReelsPage() {
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

  const handleSaveReel = (reelData: Partial<Reel>) => {
    if (!firestore || !user || !canEdit) return;
    setIsSaving(true);
    
    if (editingReel && editingReel.id) {
       const docRef = doc(firestore, 'reels', editingReel.id);
       updateDocumentNonBlocking(docRef, reelData);
       toast({ title: 'Reel Updated' });
    } else {
        const dataWithMeta = {
         ...reelData,
         createdBy: user.uid,
         createdAt: serverTimestamp()
       }
       const collectionRef = collection(firestore, 'reels');
       addDocumentNonBlocking(collectionRef, dataWithMeta);
       toast({ title: 'Reel Added' });
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
    return reels.filter(reel => {
        if (!searchFilter) return true;
        const lowercasedFilter = searchFilter.toLowerCase();
        const paperType = paperTypes?.find(p => p.id === reel.paperTypeId);
        const paperNameMatch = paperType?.paperName.toLowerCase().includes(lowercasedFilter);
        const reelNoMatch = reel.reelNo.toLowerCase().includes(lowercasedFilter);
        const sizeMatch = reel.length.toString().includes(lowercasedFilter);
        return paperNameMatch || reelNoMatch || sizeMatch;
    }).sort((a,b) => {
        if (!b.createdAt || !a.createdAt) return 0;
        if (typeof b.createdAt.toMillis !== 'function' || typeof a.createdAt.toMillis !== 'function') return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
  }, [reels, searchFilter, paperTypes]);

  const getPaperTypeName = (paperTypeId: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  
  const statusVariant = (status: Reel['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
        case 'Available': return 'default';
        case 'In Use': return 'secondary';
        case 'Finished': return 'outline';
        case 'Hold': return 'destructive';
    }
  };
   const statusColor = (status: Reel['status']): string => {
    switch (status) {
        case 'Available': return 'bg-green-600 dark:bg-green-800';
        case 'In Use': return 'bg-amber-500 dark:bg-amber-700';
        case 'Finished': return 'border-dashed';
        case 'Hold': return 'bg-orange-500 dark:bg-orange-700';
    }
  };

  const isLoading = loadingReels || loadingPaperTypes;
  
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] sm:h-screen">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-10 p-4 border-b">
         <h1 className="text-2xl font-bold text-center mb-4">🧾 Reels</h1>
         <div className="relative">
            <Input 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                placeholder="Search paper, reel no, size..." 
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
                    <p className="text-muted-foreground">No reels found. { searchFilter ? "Try a different search." : "Add a reel to get started."}</p>
                </div>
            )}
        </div>
      </main>

       {canEdit && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
             <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-20" size="icon" onClick={() => openSheet()}>
                <Plus className="h-6 w-6" />
                <span className="sr-only">Add New Reel</span>
             </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>{editingReel ? 'Edit' : 'Add New'} Reel</SheetTitle>
            </SheetHeader>
            <ReelForm 
                paperTypes={paperTypes}
                onSave={handleSaveReel}
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
    
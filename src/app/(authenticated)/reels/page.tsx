'use client';

import { Button } from '@/components/ui/button';
import { Plus, Trash2, Camera, X, Upload, ArrowRight, ArrowLeft } from 'lucide-react';
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
import { Reel, PaperType, User as AppUser, ExtractedReel } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { extractReelsFromImage } from '@/ai/flows/extract-reels-flow';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const BulkAddReelsContent = ({
  paperTypes,
  onSave,
  onClose,
  isSaving,
}: {
  paperTypes: PaperType[] | null,
  onSave: (reelsToSave: Partial<Reel>[]) => void,
  onClose: () => void,
  isSaving: boolean,
}) => {
  const [step, setStep] = useState(1);
  const [selectedPaperTypeId, setSelectedPaperTypeId] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedReels, setExtractedReels] = useState<ExtractedReel[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraView, setIsCameraView] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean|null>(null);
  const { toast } = useToast();

  const selectedPaper = useMemo(() => paperTypes?.find(p => p.id === selectedPaperTypeId), [selectedPaperTypeId, paperTypes]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraView) {
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
  }, [isCameraView, toast]);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setIsCameraView(false);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCaptureFromVideo = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUri = canvas.toDataURL('image/jpeg');
            setImage(dataUri);
            setIsCameraView(false);
        }
    }
  }
  
  const handleProcessImage = async () => {
      if (!image) {
          toast({ variant: 'destructive', title: 'No image selected' });
          return;
      }
      setIsProcessing(true);
      try {
          const result = await extractReelsFromImage({ photoDataUri: image });
          setExtractedReels(result.reels);
          setStep(3);
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Extraction Failed', description: 'Could not extract reel data from the image.'});
      } finally {
          setIsProcessing(false);
      }
  }
  
  const handleReelDataChange = (index: number, field: keyof ExtractedReel, value: string | number) => {
    const updatedReels = [...extractedReels];
    (updatedReels[index] as any)[field] = value;
    setExtractedReels(updatedReels);
  };

  const deleteReelRow = (index: number) => {
    setExtractedReels(extractedReels.filter((_, i) => i !== index));
  }

  const handleSave = () => {
    if (!selectedPaper) return;

    const reelsToSave: Partial<Reel>[] = extractedReels.map(er => ({
      paperTypeId: selectedPaper.id,
      gsm: selectedPaper.gsm,
      length: selectedPaper.length,
      reelNo: er.reelNumber,
      weight: Number(er.reelWeight),
      status: 'Available'
    }));

    onSave(reelsToSave);
  }

  const reset = useCallback(() => {
    setStep(1);
    setSelectedPaperTypeId('');
    setImage(null);
    setExtractedReels([]);
    setIsCameraView(false);
    setIsProcessing(false);
    onClose();
  }, [onClose]);

  const step1 = (
    <>
        <DialogHeader>
            <DialogTitle>Step 1: Select Paper Details</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="paper-type">Paper Type</Label>
                <Select value={selectedPaperTypeId} onValueChange={setSelectedPaperTypeId}>
                    <SelectTrigger id="paper-type" className="h-11"><SelectValue placeholder="Select paper" /></SelectTrigger>
                    <SelectContent>
                        {paperTypes?.map(p => <SelectItem key={p.id} value={p.id}>{p.paperName} ({p.gsm}gsm, {p.length}cm)</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {selectedPaper && (
                <div className="p-3 bg-muted/50 rounded-md text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                    <span>GSM:</span> <span className="text-right font-medium">{selectedPaper.gsm}</span>
                    <span>Size:</span> <span className="text-right font-medium">{selectedPaper.length}cm x {selectedPaper.breadth}cm</span>
                </div>
            )}
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={reset} className="w-full h-11">Cancel</Button>
            <Button onClick={() => setStep(2)} disabled={!selectedPaperTypeId} className="w-full h-11">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </DialogFooter>
    </>
  );

  const step2 = (
     <>
        <DialogHeader>
             <DialogTitle>Step 2: Upload or Scan Reel List</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center justify-center gap-4">
             <div className="w-full aspect-video rounded-md bg-muted relative overflow-hidden">
                {isCameraView ? (
                     <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                ) : image ? (
                    <Image src={image} alt="Reel list preview" layout="fill" className="object-contain" />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Camera className="h-12 w-12 mb-2"/>
                        <p>Image preview will appear here</p>
                    </div>
                )}
                {image && <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={() => setImage(null)}><X className="h-4 w-4"/></Button>}
             </div>
             {hasCameraPermission === false && isCameraView && (
                <Alert variant="destructive">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>Please allow camera access to use this feature.</AlertDescription>
                </Alert>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden"/>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11">
                    <Upload className="mr-2 h-4 w-4" /> Upload
                </Button>
                <Button variant="outline" onClick={() => setIsCameraView(!isCameraView)} className="h-11">
                    <Camera className="mr-2 h-4 w-4" /> {isCameraView ? 'Close Cam' : 'Open Cam'}
                </Button>
            </div>
             {isCameraView && <Button onClick={handleCaptureFromVideo} className="w-full h-11" disabled={hasCameraPermission === false}>Capture Photo</Button>}
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row-reverse sm:justify-start gap-2">
            <Button onClick={handleProcessImage} disabled={!image || isProcessing} className="w-full h-11">
                {isProcessing ? 'Extracting Data...' : 'Extract & Preview'}
            </Button>
            <Button variant="outline" onClick={() => setStep(1)} className="w-full h-11"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        </DialogFooter>
     </>
  );

  const step3 = (
    <>
        <DialogHeader>
            <DialogTitle>Step 3: Preview & Confirm</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="p-3 bg-muted/50 rounded-md text-sm">
                <strong>Paper:</strong> {selectedPaper?.paperName} ({selectedPaper?.gsm}gsm, {selectedPaper?.length}cm x {selectedPaper?.breadth}cm)
            </div>
            <div className="overflow-auto max-h-60">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead className="w-16">Sr No</TableHead>
                            <TableHead>Reel No</TableHead>
                            <TableHead>Weight (kg)</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {extractedReels.map((reel, index) => (
                            <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                    <Input value={reel.reelNumber} onChange={(e) => handleReelDataChange(index, 'reelNumber', e.target.value)} className="h-9"/>
                                </TableCell>
                                <TableCell>
                                    <Input type="number" value={reel.reelWeight} onChange={(e) => handleReelDataChange(index, 'reelWeight', e.target.value)} className="h-9" />
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => deleteReelRow(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row-reverse sm:justify-start gap-2">
             <Button onClick={handleSave} disabled={isSaving || extractedReels.length === 0} className="w-full h-11">
                {isSaving ? 'Saving...' : `Save ${extractedReels.length} Reels`}
             </Button>
             <Button variant="outline" onClick={() => setStep(2)} className="w-full h-11"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        </DialogFooter>
    </>
  );

  return (
    <>
      <canvas ref={canvasRef} className="hidden"></canvas>
      {step === 1 && step1}
      {step === 2 && step2}
      {step === 3 && step3}
    </>
  )
}

export default function ReelsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchFilter, setSearchFilter] = useState('');

  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const reelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  
  const canEdit = useMemo(() => currentUser?.role === 'Admin' || currentUser?.role === 'Member', [currentUser]);

  const handleBulkSaveReels = async (reelsToSave: Partial<Reel>[]) => {
    if (!firestore || !user || !canEdit) return;
    setIsSaving(true);
    
    try {
        const batch = writeBatch(firestore);
        reelsToSave.forEach(reelData => {
            const docRef = doc(collection(firestore, 'reels'));
            const dataWithMeta = {
                ...reelData,
                createdBy: user.uid,
                createdAt: serverTimestamp()
            };
            batch.set(docRef, dataWithMeta);
        });
        await batch.commit();
        toast({ title: `✅ ${reelsToSave.length} Reels Added Successfully` });
        setIsBulkModalOpen(false);
    } catch(e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
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

  const bulkAddProps = {
    paperTypes,
    onSave: handleBulkSaveReels,
    onClose: () => setIsBulkModalOpen(false),
    isSaving: isSaving,
  };
  
  return (
    <div className="flex flex-col p-4 space-y-4">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold">Reel Management</h1>
            <p className="text-muted-foreground">Detailed view of all individual reels.</p>
        </div>
        
        {canEdit && (
            <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full h-12 text-base font-medium">
                        <Camera className="mr-2 h-5 w-5" /> Add Reels via Camera
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[95vw] rounded-2xl p-4" onPointerDownOutside={(e) => e.preventDefault()}>
                    <BulkAddReelsContent {...bulkAddProps} />
                </DialogContent>
            </Dialog>
        )}
      
        <div className="relative">
            <Input 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                placeholder="Search paper, reel no, size..." 
                className="h-11 w-full"
            />
        </div>

        <main className="flex-1 space-y-4">
            {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
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
                                <span className="font-medium">{(reel.weight || 0).toFixed(2)} kg</span>
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
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
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
                            )}
                        </CardFooter>
                    </Card>
                ))
            ) : (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">No reels found. { searchFilter ? "Try a different search." : "Add a reel to get started."}</p>
                </div>
            )}
        </main>
    </div>
  );
}

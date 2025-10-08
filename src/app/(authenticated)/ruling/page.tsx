
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
  DialogClose,
} from '@/components/ui/dialog';
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
import { useState, useMemo, useCallback } from 'react';
import {
  Ruling,
  RulingEntry,
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, useUser, useDoc, deleteDocumentNonBlockingById, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';


export default function RulingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);

  const rulingsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);
  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);

  const { data: rulings, isLoading: loadingRulings } = useCollection<Ruling>(rulingsQuery);
  const { data: paperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes } = useCollection<ItemType>(itemTypesQuery);
  const { data: programs } = useCollection<Program>(programsQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuling, setEditingRuling] = useState<Ruling | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [newRuling, setNewRuling] = useState<Partial<Ruling>>({ entries: [] });
  const [newEntry, setNewEntry] = useState<Partial<RulingEntry>>({});

  const canEdit = useMemo(() => currentUser?.role === 'Admin' || currentUser?.role === 'Member', [currentUser]);

  const openEditModal = (ruling: Ruling) => {
    setEditingRuling(ruling);
    setNewRuling(ruling);
    setCurrentStep(1);
    setIsModalOpen(true);
  }

  const resetForm = useCallback(() => {
    setNewRuling({ entries: [] });
    setNewEntry({});
    setCurrentStep(1);
    setIsModalOpen(false);
    setEditingRuling(null);
  }, []);

  const handleAddRulingEntry = () => {
    if (newEntry.sheetsRuled && (newEntry.programId || newEntry.cutoff) && newEntry.itemTypeId) {
       const selectedPaper = paperTypes?.find(p => p.id === newRuling.paperTypeId);
       const program = programs?.find(p => p.id === newEntry.programId);
       
       let cutoff = newEntry.cutoff || 0;
       if (program) {
         cutoff = program.cutoff;
       }

       let reamWeight = 0;
       let theoreticalSheets = 0;

       if (selectedPaper && cutoff > 0 && newRuling.reelWeight && newRuling.reelWeight > 0) {
            reamWeight = (selectedPaper.length * cutoff * selectedPaper.gsm) / 20000;
            if(reamWeight > 0) {
                theoreticalSheets = (newRuling.reelWeight * 500) / reamWeight;
            }
       }

      const entryToAdd: RulingEntry = {
        id: `${(newRuling.entries?.length || 0) + 1}`,
        ...newEntry,
        sheetsRuled: newEntry.sheetsRuled,
        cutoff,
        theoreticalSheets,
        difference: (newEntry.sheetsRuled || 0) - theoreticalSheets,
        itemTypeId: newEntry.itemTypeId,
      };
      
      setNewRuling((prev) => ({
        ...prev,
        entries: [...(prev.entries || []), entryToAdd],
      }));
      setNewEntry({});
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (newRuling.serialNo && newRuling.reelNo && newRuling.paperTypeId && newRuling.reelWeight) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
        setCurrentStep(3);
    }
  };

  const handleSaveRuling = () => {
    if (!firestore || !newRuling.status) {
      alert("Please select a final reel status.");
      return;
    };

    if (editingRuling) {
        // Update existing ruling
        const rulingDocRef = doc(firestore, 'reels', editingRuling.id);
        updateDocumentNonBlocking(rulingDocRef, newRuling);
        toast({ title: 'Ruling Updated', description: `Reel ${editingRuling.reelNo} has been updated.` });

    } else {
        // Add new ruling
        const rulingToAdd = {
          date: serverTimestamp(),
          ...newRuling,
        };
        const rulingsCollection = collection(firestore, 'reels');
        addDocumentNonBlocking(rulingsCollection, rulingToAdd);
        toast({ title: 'Ruling Added', description: `Reel ${newRuling.reelNo} has been added.` });
    }
    
    resetForm();
  }

  const handleDeleteRuling = (rulingId: string) => {
    if (!firestore) return;
    deleteDocumentNonBlockingById(firestore, 'reels', rulingId);
    toast({ variant: 'destructive', title: 'Ruling Deleted', description: 'The reel ruling has been permanently deleted.' });
  }
  
  const getProgramInfo = (programId?: string) => {
    if (!programId) return null;
    return programs?.find(p => p.id === programId);
  }

  const selectedPaper = useMemo(() => {
    return paperTypes?.find(p => p.id === newRuling.paperTypeId);
  }, [newRuling.paperTypeId, paperTypes]);


  const calculationSummary = useMemo(() => {
    if (!selectedPaper || !newRuling.reelWeight) return null;

    const totalSheetsRuled = (newRuling.entries || []).reduce((sum, entry) => sum + (entry.sheetsRuled || 0), 0);

    let totalTheoreticalSheets = 0;

    const firstEntry = (newRuling.entries || [])[0];
    if (firstEntry && firstEntry.cutoff > 0) {
        const reamWeight = (selectedPaper.length * firstEntry.cutoff * selectedPaper.gsm) / 20000;
        totalTheoreticalSheets = reamWeight > 0 ? (newRuling.reelWeight * 500) / reamWeight : 0;
    }
    
    return {
      totalSheetsRuled,
      totalTheoreticalSheets,
      totalDifference: totalSheetsRuled - totalTheoreticalSheets,
    };
  }, [newRuling, selectedPaper]);

  const getItemTypeName = (itemTypeId?: string) => itemTypes?.find(i => i.id === itemTypeId)?.name;

  if (isLoadingCurrentUser) {
    return (
      <>
        <PageHeader
          title="Reel Ruling"
          description="Log reel ruling with or without a program, and manage multiple rulings per reel."
        />
        <Card>
          <CardHeader>
            <CardTitle>Loading Rulings...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait...</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reel Ruling"
        description="Log reel ruling with or without a program, and manage multiple rulings per reel."
      >
        <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
            if (!isOpen) resetForm();
            setIsModalOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Reel Ruling
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90svh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingRuling ? 'Edit' : 'Add'} Reel Ruling</DialogTitle>
              <DialogDescription>
                {editingRuling ? 'Update the details for this reel ruling.' : 'Follow the steps to log a new ruling for a reel.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-6 -mr-6">
            {/* Step 1: Reel Details */}
            {currentStep === 1 && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" value={new Date((newRuling.date as Timestamp)?.toDate() || Date.now()).toLocaleDateString()} readOnly disabled />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="serialNo">Serial No.</Label>
                    <Input
                      id="serialNo"
                      value={newRuling.serialNo || ''}
                      onChange={(e) => setNewRuling({ ...newRuling, serialNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reelNo">Reel No.</Label>
                    <Input
                      id="reelNo"
                      value={newRuling.reelNo || ''}
                      onChange={(e) => setNewRuling({ ...newRuling, reelNo: e.target.value })}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="reelWeight">Reel Weight (kg)</Label>
                    <Input
                      id="reelWeight"
                      type="number"
                      value={newRuling.reelWeight || ''}
                      onChange={(e) => setNewRuling({ ...newRuling, reelWeight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paperTypeId">Paper Type</Label>
                  <Select value={newRuling.paperTypeId || ''} onValueChange={(value) => setNewRuling({ ...newRuling, paperTypeId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select paper" />
                    </SelectTrigger>
                    <SelectContent>
                      {paperTypes?.map((paper) => (
                        <SelectItem key={paper.id} value={paper.id}>
                          {paper.paperName} ({paper.gsm}gsm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedPaper && (
                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                        <p>GSM: {selectedPaper.gsm}</p>
                        <p>Length: {selectedPaper.length} cm</p>
                    </div>
                )}
              </div>
            )}

            {/* Step 2: Ruling Entries */}
            {currentStep === 2 && (
              <div className="py-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg">
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="programId">Program (Optional)</Label>
                        <Select onValueChange={(value) => {
                            const program = getProgramInfo(value);
                            setNewEntry({
                                ...newEntry,
                                programId: value === 'no-program' ? undefined : value,
                                itemTypeId: program?.itemTypeId,
                                cutoff: program?.cutoff,
                            })
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a program" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-program">No Program</SelectItem>
                                {programs?.map((prog) => (
                                    <SelectItem key={prog.id} value={prog.id}>{prog.brand} - {getItemTypeName(prog.itemTypeId)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="itemTypeId">Item Type</Label>
                        <Select
                            value={newEntry.itemTypeId || ''}
                            onValueChange={(value) => setNewEntry({...newEntry, itemTypeId: value})}
                            disabled={!!newEntry.programId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select item"/>
                            </SelectTrigger>
                            <SelectContent>
                                {itemTypes?.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.itemName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cutoff">Cutoff (cm)</Label>
                        <Input
                            id="cutoff"
                            type="number"
                            value={newEntry.cutoff || ''}
                            onChange={(e) => setNewEntry({...newEntry, cutoff: parseFloat(e.target.value)})}
                            disabled={!!newEntry.programId}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sheetsRuled">Sheets Ruled</Label>
                        <Input
                            id="sheetsRuled"
                            type="number"
                            value={newEntry.sheetsRuled || ''}
                            onChange={(e) => setNewEntry({...newEntry, sheetsRuled: parseInt(e.target.value) || 0})}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Button onClick={handleAddRulingEntry} className="w-full">Add Ruling Entry</Button>
                    </div>
                </div>

                <div className="mt-4">
                    <h4 className="font-semibold mb-2">Current Entries for this Reel</h4>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Sheets</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {newRuling.entries && newRuling.entries.length > 0 ? newRuling.entries.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="whitespace-nowrap">{getItemTypeName(entry.itemTypeId)}</TableCell>
                                        <TableCell>{entry.sheetsRuled?.toLocaleString()}</TableCell>
                                        <TableCell className="whitespace-nowrap">{getProgramInfo(entry.programId)?.brand || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setNewRuling(prev => ({...prev, entries: prev.entries?.filter(e => e.id !== entry.id)}))}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={4} className="text-center">No entries yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
              </div>
            )}
            
            {/* Step 3: Summary & Finish */}
            {currentStep === 3 && (
                <div className="py-4 space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Reel Summary</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                            <p><strong>Serial No:</strong> {newRuling.serialNo}</p>
                            <p><strong>Reel No:</strong> {newRuling.reelNo}</p>
                            <p><strong>Paper:</strong> {paperTypes?.find(p => p.id === newRuling.paperTypeId)?.paperName}</p>
                            <p><strong>Reel Weight:</strong> {newRuling.reelWeight} kg</p>                        
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Ruling Entries & Calculations</CardTitle></CardHeader>
                        <CardContent>
                            {newRuling.entries && newRuling.entries.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item</TableHead>
                                                <TableHead>Ruled</TableHead>
                                                <TableHead>Theoretical</TableHead>
                                                <TableHead className="text-right">Difference</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {newRuling.entries.map(e => (
                                                <TableRow key={e.id}>
                                                    <TableCell className="whitespace-nowrap">{getItemTypeName(e.itemTypeId)}</TableCell>
                                                    <TableCell>{e.sheetsRuled?.toLocaleString()}</TableCell>
                                                    <TableCell>{Math.round(e.theoreticalSheets || 0).toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">
                                                         <Badge variant={e.difference >= 0 ? 'default' : 'destructive'} className={e.difference >= 0 ? 'bg-green-600' : ''}>
                                                            {Math.round(e.difference || 0).toLocaleString()}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ): <p className="text-sm text-muted-foreground">No ruling entries were added.</p>}

                            {calculationSummary && (
                                <div className="mt-4 pt-4 border-t">
                                  <h4 className="font-semibold">Total Summary</h4>
                                  <div className="text-sm mt-2 space-y-1">
                                    <div>Total Sheets Ruled: {calculationSummary.totalSheetsRuled.toLocaleString()}</div>
                                    <div>Total Theoretical Sheets: {Math.round(calculationSummary.totalTheoreticalSheets).toLocaleString()}</div>
                                    <div className="flex items-center">Overall Difference: 
                                        <Badge variant={calculationSummary.totalDifference >= 0 ? 'default' : 'destructive'} className={`ml-2 ${calculationSummary.totalDifference >= 0 ? 'bg-green-600' : ''}`}>
                                            {Math.round(calculationSummary.totalDifference).toLocaleString()}
                                        </Badge>
                                    </div>
                                  </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                        <Label htmlFor="status">Final Reel Status</Label>
                         <Select value={newRuling.status} onValueChange={(value) => setNewRuling({...newRuling, status: value as "Partially Used" | "Finished"})}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select final status"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Partially Used">Partially Used</SelectItem>
                                <SelectItem value="Finished">Finished</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            </div>
            <DialogFooter className="mt-auto pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              {currentStep > 1 && (
                 <Button variant="secondary" onClick={() => setCurrentStep(currentStep - 1)}>
                    Back
                </Button>
              )}
              {currentStep < 3 && (
                <Button onClick={handleNextStep}>
                  Next
                </Button>
              )}
              {currentStep === 3 && (
                 <Button onClick={handleSaveRuling}>
                    Save Ruling
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reel Rulings</CardTitle>
            <CardDescription>A list of all reel rulings.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRulings ? (
                 <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">Loading rulings...</p>
                </div>
            ) : rulings && rulings.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                {rulings.map(ruling => (
                    <AccordionItem value={ruling.id} key={ruling.id}>
                       <div className="flex items-center w-full">
                         <AccordionTrigger className="flex-1">
                            <div className="flex justify-between items-center w-full pr-4 text-left">
                                <span className="font-semibold">Reel: {ruling.reelNo} (SN: {ruling.serialNo})</span>
                                <Badge variant={ruling.status === 'Finished' ? 'default' : 'secondary'} className={`ml-2 whitespace-nowrap ${ruling.status === 'Finished' ? 'bg-green-600' : ''}`}>{ruling.status}</Badge>
                            </div>
                         </AccordionTrigger>
                        {canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="ml-2">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => openEditModal(ruling)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the reel ruling for reel <strong>{ruling.reelNo}</strong>.
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
                                    {ruling.entries.map((entry, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="whitespace-nowrap">{getItemTypeName(entry.itemTypeId)}</TableCell>
                                            <TableCell>{entry.sheetsRuled.toLocaleString()}</TableCell>
                                            <TableCell className="whitespace-nowrap">{getProgramInfo(entry.programId)?.brand || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={entry.difference >= 0 ? 'default' : 'destructive'} className={entry.difference >= 0 ? 'bg-green-600' : ''}>
                                                    {Math.round(entry.difference || 0).toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
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

'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
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
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Program, PaperType, ItemType, User as AppUser } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking, deleteDocumentNonBlockingById, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, addDoc } from 'firebase/firestore';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';


const ProgramForm = ({
  paperTypes,
  itemTypes,
  loadingPaperTypes,
  loadingItemTypes,
  onSave,
  onClose,
  isSaving,
  initialData,
}: {
  paperTypes: PaperType[] | null,
  itemTypes: ItemType[] | null,
  loadingPaperTypes: boolean,
  loadingItemTypes: boolean,
  onSave: (program: Partial<Program>) => void,
  onClose: () => void,
  isSaving: boolean,
  initialData?: Partial<Program> | null,
}) => {
  const [program, setProgram] = useState<Partial<Program>>({});
  const { toast } = useToast();

  useEffect(() => {
    setProgram(initialData || {
      brand: '',
      bundlesRequired: 0,
      cutoff: 0,
      notebookPages: 0,
      piecesPerBundle: 0,
      ups: 0,
      coverIndex: 0,
    });
  }, [initialData]);

  const handleInputChange = (field: keyof Program, value: string | number) => {
    setProgram((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: keyof Program, value: string) => {
    if (field === 'paperTypeId') {
      const selectedPaper = paperTypes?.find((p) => p.id === value);
      if (selectedPaper) {
        setProgram((prev) => ({
          ...prev,
          paperTypeId: value,
          gsm: selectedPaper.gsm,
          length: selectedPaper.length,
        }));
      }
    } else {
      setProgram((prev) => ({ ...prev, [field]: value }));
    }
  };
  
  const calculatedValues = useMemo(() => {
    const {
      notebookPages = 0,
      coverIndex = 0,
      ups = 0,
      piecesPerBundle = 0,
      bundlesRequired = 0,
      length = 0,
      cutoff = 0,
      gsm = 0,
    } = program;

    const netPages = notebookPages > 0 ? notebookPages - coverIndex : 0;
    const sheetsPerNotebook = netPages > 0 && ups > 0 ? netPages / ups : 0;
    const sheetsPerBundle = piecesPerBundle > 0 && ups > 0 ? (piecesPerBundle / ups) * sheetsPerNotebook : 0;
    const totalSheetsRequired = bundlesRequired * sheetsPerBundle;
    const reamWeight = length > 0 && cutoff > 0 && gsm > 0 ? (length * cutoff * gsm * 500) / 10000 : 0;
    
    return { reamWeight, totalSheetsRequired: Math.ceil(totalSheetsRequired), counting: sheetsPerNotebook, sheetsPerBundle };
  }, [program]);


  const handleCreateProgram = () => {
    const requiredFields: (keyof Program)[] = ['brand', 'paperTypeId', 'itemTypeId', 'cutoff', 'notebookPages', 'ups', 'piecesPerBundle', 'bundlesRequired'];
    const isFormValid = requiredFields.every(field => {
      const value = program[field as keyof typeof program];
      return value !== undefined && value !== '' && (typeof value !== 'number' || value > 0);
    });

    if (!isFormValid) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Please fill out all required fields with valid numbers greater than zero.',
        });
        return;
    }

    const programToSave: Partial<Program> = {
      ...program,
      reamWeight: calculatedValues.reamWeight,
      totalSheetsRequired: calculatedValues.totalSheetsRequired,
      counting: calculatedValues.counting,
    };
    
    onSave(programToSave);
  }

  return (
    <>
      <div className="p-4 space-y-6 overflow-y-auto max-h-[80vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="brand">Brand Name</Label>
              <Input id="brand" value={program.brand || ''} onChange={(e) => handleInputChange('brand', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paperTypeId">Paper Type</Label>
              <Select onValueChange={(value) => handleSelectChange('paperTypeId', value)} disabled={loadingPaperTypes} value={program.paperTypeId}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select paper" /></SelectTrigger>
                <SelectContent>
                  {paperTypes?.map((paper) => (<SelectItem key={paper.id} value={paper.id}>{paper.paperName}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemTypeId">Item Type</Label>
                <Select onValueChange={(value) => handleSelectChange('itemTypeId', value)} disabled={loadingItemTypes} value={program.itemTypeId}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select item type" /></SelectTrigger>
                  <SelectContent>
                    {itemTypes?.map((item) => (<SelectItem key={item.id} value={item.id}>{item.itemName}</SelectItem>))}
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cutoff">Cutoff (cm)</Label>
              <Input id="cutoff" type="number" value={program.cutoff || ''} onChange={(e) => handleInputChange('cutoff', parseFloat(e.target.value) || 0)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notebookPages">Notebook Pages</Label>
              <Input id="notebookPages" type="number" value={program.notebookPages || ''} onChange={(e) => handleInputChange('notebookPages', parseInt(e.target.value) || 0)} className="h-11" />
            </div>
              <div className="space-y-2">
              <Label htmlFor="coverIndex">Cover &amp; Index Pages</Label>
              <Input id="coverIndex" type="number" value={program.coverIndex || ''} onChange={(e) => handleInputChange('coverIndex', parseInt(e.target.value) || 0)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="piecesPerBundle">Pieces per Bundle</Label>
              <Input id="piecesPerBundle" type="number" value={program.piecesPerBundle || ''} onChange={(e) => handleInputChange('piecesPerBundle', parseInt(e.target.value) || 0)} className="h-11" />
            </div>
              <div className="space-y-2">
              <Label htmlFor="bundlesRequired">Bundles Required</Label>
              <Input id="bundlesRequired" type="number" value={program.bundlesRequired || ''} onChange={(e) => handleInputChange('bundlesRequired', parseInt(e.target.value) || 0)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ups">UPS</Label>
              <Input id="ups" type="number" value={program.ups || ''} onChange={(e) => handleInputChange('ups', parseInt(e.target.value) || 0)} className="h-11" />
            </div>
              <div className="space-y-2 sm:col-span-2 grid grid-cols-2 gap-4">
                <div>
                <Label htmlFor="gsm-readonly">GSM</Label>
                <Input id="gsm-readonly" value={program.gsm || ''} readOnly disabled className="h-11" />
                </div>
                <div>
                <Label htmlFor="length-readonly">Size (cm)</Label>
                <Input id="length-readonly" value={program.length || ''} readOnly disabled className="h-11" />
                </div>
              </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-base">View Calculations</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4 rounded-md bg-muted/50 p-4">
                  <h3 className="font-semibold text-lg">Calculations</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sheets per Notebook (Counting)</Label>
                    <Input value={calculatedValues.counting.toFixed(2)} readOnly disabled className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sheets per Bundle</Label>
                    <Input value={calculatedValues.sheetsPerBundle.toFixed(2)} readOnly disabled className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Sheets Required</Label>
                    <Input value={calculatedValues.totalSheetsRequired.toLocaleString()} readOnly disabled className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ream Weight (kg)</Label>
                    <Input value={calculatedValues.reamWeight.toFixed(2)} readOnly disabled className="h-11" />
                  </div>
                  </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </div>

      <DialogFooter className="p-4 border-t sticky bottom-0 bg-background z-10 w-full">
        <Button variant="outline" disabled={isSaving} onClick={onClose} className="w-full sm:w-auto h-11">Cancel</Button>
        <Button onClick={handleCreateProgram} disabled={isSaving} className="w-full sm:w-auto h-11">
          {isSaving ? 'Saving...' : 'Save Program'}
        </Button>
      </DialogFooter>
    </>
  );
}


export default function ProgramPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);

  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);

  const { data: programs, isLoading: loadingPrograms } = useCollection<Program>(programsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  
  const canEdit = useMemo(() => {
    if (isLoadingCurrentUser || !currentUser) return false;
    return currentUser.role === 'Admin' || currentUser.role === 'Member';
  }, [currentUser, isLoadingCurrentUser]);


  const openModal = (program?: Program) => {
    setEditingProgram(program || null);
    setIsModalOpen(true);
  }
  
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingProgram(null);
  }, []);

  const handleSaveProgram = async (programData: Partial<Program>) => {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      if (editingProgram) {
          const docRef = doc(firestore, 'programs', editingProgram.id);
          updateDocumentNonBlocking(docRef, programData);
          toast({ title: 'Program Updated' });
      } else {
          const programToAdd = {
            ...programData,
            date: serverTimestamp(),
          };
          const collectionRef = collection(firestore, 'programs');
          await addDoc(collectionRef, programToAdd);
          toast({ title: 'Program Created' });
      }
      closeModal();
    } catch(e) {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save program.'});
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteProgram = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlockingById(firestore, 'programs', id);
    toast({ title: 'Program Deleted' });
  }

  const getPaperTypeName = (paperTypeId?: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName;
  const getItemTypeName = (itemTypeId?: string) => itemTypes?.find(i => i.id === itemTypeId)?.itemName;
  
  const renderProgramList = () => {
    if (loadingPrograms) {
      return <div className="p-4 text-center text-muted-foreground">Loading programs...</div>;
    }
    if (!programs || programs.length === 0) {
      return <div className="p-4 text-center text-muted-foreground">No programs created yet.</div>;
    }
    
    if (isMobile) {
      return (
        <Accordion type="single" collapsible className="w-full">
          {programs.map(program => (
            <AccordionItem value={program.id} key={program.id}>
              <div className="flex items-center w-full">
                <AccordionTrigger className="flex-1 py-4">
                  <div className="flex flex-col text-left">
                    <span className="font-semibold">{program.brand}</span>
                    <span className="text-sm text-muted-foreground">{getItemTypeName(program.itemTypeId)}</span>
                  </div>
                </AccordionTrigger>
                {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ml-2 shrink-0" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openModal(program)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the program: <strong>{program.brand}</strong>.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteProgram(program.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                )}
              </div>
              <AccordionContent>
                <div className="space-y-2 text-sm p-2 bg-muted/50 rounded-md">
                  <p><strong>Paper:</strong> {getPaperTypeName(program.paperTypeId)} ({program.gsm}gsm, {program.length}cm)</p>
                  <p><strong>Sheets Required:</strong> {program.totalSheetsRequired?.toLocaleString()}</p>
                  <p><strong>Ream Weight:</strong> {program.reamWeight?.toFixed(2)} kg</p>
                  <p><strong>Cutoff:</strong> {program.cutoff} cm</p>
                  <p><strong>UPS:</strong> {program.ups}</p>
                  <p><strong>Counting:</strong> {program.counting ? program.counting.toFixed(2) : 'N/A'}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      );
    }

    return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Paper</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Sheets Req.</TableHead>
                <TableHead>Ream Wt. (kg)</TableHead>
                {canEdit && <TableHead className="w-[50px] text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium whitespace-nowrap">{program.brand}</TableCell>
                  <TableCell className="whitespace-nowrap">{getPaperTypeName(program.paperTypeId)}</TableCell>
                  <TableCell className="whitespace-nowrap">{getItemTypeName(program.itemTypeId)}</TableCell>
                  <TableCell>{program.totalSheetsRequired?.toLocaleString()}</TableCell>
                  <TableCell>{program.reamWeight?.toFixed(2)}</TableCell>
                  {canEdit && (
                      <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => openModal(program)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the program: <strong>{program.brand}</strong>.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteProgram(program.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    );
  };
  
  const renderTrigger = () => (
     <Button onClick={() => openModal()} className="h-11">
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Program
    </Button>
  );

  const formProps = {
    paperTypes,
    itemTypes,
    loadingPaperTypes,
    loadingItemTypes,
    onSave: handleSaveProgram,
    onClose: closeModal,
    isSaving,
    initialData: editingProgram,
  };

  return (
    <>
      <PageHeader
        title="Production Program"
        description="Create and manage production programs with detailed calculations."
      >
        {canEdit && (
          isMobile ? (
             <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
              <SheetTrigger asChild>{renderTrigger()}</SheetTrigger>
              <SheetContent side="bottom" className="p-0 flex flex-col h-auto max-h-[90svh]">
                 <SheetHeader className="p-4 border-b">
                    <SheetTitle>{editingProgram ? 'Edit' : 'Create New'} Production Program</SheetTitle>
                    <SheetDescription>
                      Fill in the details. Calculated values update automatically.
                    </SheetDescription>
                  </SheetHeader>
                  <ProgramForm {...formProps} />
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>{renderTrigger()}</DialogTrigger>
              <DialogContent className="p-0 sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle>{editingProgram ? 'Edit' : 'Create New'} Production Program</DialogTitle>
                  <DialogDescription>
                    Fill in the details. Calculated values will update automatically.
                  </DialogDescription>
                </DialogHeader>
                <ProgramForm {...formProps} />
              </DialogContent>
            </Dialog>
          )
        )}
      </PageHeader>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Production Programs</CardTitle>
            <CardDescription>
              List of all created production programs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {renderProgramList()}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

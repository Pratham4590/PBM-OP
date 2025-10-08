'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle } from 'lucide-react';
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
import { useState, useMemo, useEffect } from 'react';
import { Program, PaperType, ItemType, User as AppUser } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, useUser, useDoc } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { addDoc } from 'firebase/firestore';

export default function ProgramPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser } = useDoc<AppUser>(currentUserDocRef);

  const programsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'programs') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);

  const { data: programs, isLoading: loadingPrograms } = useCollection<Program>(programsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes, isLoading: loadingItemTypes } = useCollection<ItemType>(itemTypesQuery);

  const [newProgram, setNewProgram] = useState<Partial<Program>>({
    brand: '',
    bundlesRequired: 0,
    cutoff: 0,
    notebookPages: 0,
    piecesPerBundle: 0,
    ups: 0,
    coverIndex: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [isModalOpen]);


  const handleInputChange = (
    field: keyof Program,
    value: string | number
  ) => {
    setNewProgram((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: keyof Program, value: string) => {
    if (field === 'paperTypeId') {
      const selectedPaper = paperTypes?.find((p) => p.id === value);
      if (selectedPaper) {
        setNewProgram((prev) => ({
          ...prev,
          paperTypeId: value,
          gsm: selectedPaper.gsm,
          length: selectedPaper.length,
        }));
      }
    } else {
      setNewProgram((prev) => ({ ...prev, [field]: value }));
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
    } = newProgram;

    const netPages = notebookPages > 0 ? notebookPages - coverIndex : 0;
    const sheetsPerNotebook = netPages > 0 && ups > 0 ? netPages / ups : 0;
    const sheetsPerBundle = piecesPerBundle > 0 && ups > 0 ? (piecesPerBundle / ups) * sheetsPerNotebook : 0;
    const totalSheetsRequired = bundlesRequired * sheetsPerBundle;
    const reamWeight = length > 0 && cutoff > 0 && gsm > 0 ? (length * cutoff * gsm * 500) / 10000 : 0;
    
    return { reamWeight, totalSheetsRequired: Math.ceil(totalSheetsRequired), counting: sheetsPerNotebook, sheetsPerBundle };
  }, [newProgram]);

  const handleCreateProgram = async () => {
    if (!firestore) return;
    
    // Basic validation
    const requiredFields: (keyof Program)[] = ['brand', 'paperTypeId', 'itemTypeId', 'cutoff', 'notebookPages', 'ups', 'piecesPerBundle', 'bundlesRequired'];
    const isFormValid = requiredFields.every(field => newProgram[field] !== undefined && newProgram[field] !== '' && newProgram[field] !== 0);

    if (!isFormValid) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Please fill out all required fields.',
        });
        return;
    }

    setIsSaving(true);
    
    const programToAdd = {
      date: serverTimestamp(),
      ...newProgram,
      ...calculatedValues,
    };
    
    try {
      const programsCollection = collection(firestore, 'programs');
      await addDoc(programsCollection, programToAdd);
      
      toast({
        title: 'Program Created',
        description: `${newProgram.brand} has been successfully created.`,
      });

      setNewProgram({
        brand: '',
        bundlesRequired: 0,
        cutoff: 0,
        notebookPages: 0,
        piecesPerBundle: 0,
        ups: 0,
        coverIndex: 0,
      });
      setIsModalOpen(false);
    } catch(error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create the program. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPaperTypeName = (paperTypeId?: string) => paperTypes?.find(p => p.id === paperTypeId)?.name;
  const getItemTypeName = (itemTypeId?: string) => itemTypes?.find(i => i.id === itemTypeId)?.name;
  
  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Member';

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
              <AccordionTrigger>
                <div className="flex flex-col text-left">
                  <span className="font-semibold">{program.brand}</span>
                  <span className="text-sm text-muted-foreground">{getItemTypeName(program.itemTypeId)}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p><strong>Paper:</strong> {getPaperTypeName(program.paperTypeId)} ({program.gsm}gsm, {program.length}cm)</p>
                  <p><strong>Sheets Required:</strong> {program.totalSheetsRequired.toLocaleString()}</p>
                  <p><strong>Ream Weight:</strong> {program.reamWeight.toFixed(2)} kg</p>
                  <p><strong>Cutoff:</strong> {program.cutoff} cm</p>
                  <p><strong>UPS:</strong> {program.ups}</p>
                  <p><strong>Counting:</strong> {typeof program.counting === 'number' ? program.counting.toFixed(2) : 'N/A'}</p>
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
                <TableHead className="text-right">Ream Wt. (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {program.brand}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getPaperTypeName(program.paperTypeId)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getItemTypeName(program.itemTypeId)}
                  </TableCell>
                  <TableCell>
                    {program.totalSheetsRequired.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {program.reamWeight.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Production Program"
        description="Create and manage production programs with detailed calculations."
      >
        {canEdit && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Program
            </Button>
          </DialogTrigger>
          <DialogContent className="p-0 flex flex-col max-w-4xl h-full sm:h-auto sm:max-h-[90vh]">
            <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10">
              <DialogTitle>Create New Production Program</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new program. Calculated values
                will update automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="brand">Brand Name</Label>
                    <Input
                      id="brand"
                      value={newProgram.brand || ''}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paperTypeId">Paper Type</Label>
                    <Select
                      onValueChange={(value) =>
                        handleSelectChange('paperTypeId', value)
                      }
                      disabled={loadingPaperTypes}
                      value={newProgram.paperTypeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select paper" />
                      </SelectTrigger>
                      <SelectContent>
                        {paperTypes?.map((paper) => (
                          <SelectItem key={paper.id} value={paper.id}>
                            {paper.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemTypeId">Item Type</Label>
                     <Select onValueChange={(value) => handleSelectChange('itemTypeId', value)} disabled={loadingItemTypes} value={newProgram.itemTypeId}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select item type" />
                       </SelectTrigger>
                       <SelectContent>
                         {itemTypes?.map((item) => (
                           <SelectItem key={item.id} value={item.id}>
                             {item.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cutoff">Cutoff (cm)</Label>
                    <Input
                      id="cutoff"
                      type="number"
                      value={newProgram.cutoff || ''}
                      onChange={(e) => handleInputChange('cutoff', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notebookPages">Notebook Pages</Label>
                    <Input
                      id="notebookPages"
                      type="number"
                      value={newProgram.notebookPages || ''}
                      onChange={(e) => handleInputChange('notebookPages', parseInt(e.target.value) || 0)}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="coverIndex">Cover &amp; Index Pages</Label>
                    <Input
                      id="coverIndex"
                      type="number"
                      value={newProgram.coverIndex || ''}
                      onChange={(e) => handleInputChange('coverIndex', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="piecesPerBundle">Pieces per Bundle</Label>
                    <Input
                      id="piecesPerBundle"
                      type="number"
                      value={newProgram.piecesPerBundle || ''}
                      onChange={(e) => handleInputChange('piecesPerBundle', parseInt(e.target.value) || 0)}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="bundlesRequired">Bundles Required</Label>
                    <Input
                      id="bundlesRequired"
                      type="number"
                      value={newProgram.bundlesRequired || ''}
                      onChange={(e) => handleInputChange('bundlesRequired', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ups">UPS</Label>
                    <Input
                      id="ups"
                      type="number"
                      value={newProgram.ups || ''}
                      onChange={(e) => handleInputChange('ups', parseInt(e.target.value) || 0)}
                    />
                  </div>
                   <div className="space-y-2 sm:col-span-2 grid grid-cols-2 gap-4">
                     <div>
                      <Label htmlFor="gsm-readonly">GSM</Label>
                      <Input id="gsm-readonly" value={newProgram.gsm || ''} readOnly disabled />
                     </div>
                     <div>
                      <Label htmlFor="length-readonly">Size (cm)</Label>
                      <Input id="length-readonly" value={newProgram.length || ''} readOnly disabled />
                     </div>
                   </div>
                </div>
                <div className="space-y-4 rounded-md bg-muted p-4 h-fit md:sticky md:top-4">
                  <h3 className="font-semibold text-lg">Calculations</h3>
                   <div className="space-y-2">
                    <Label>Sheets per Notebook (Counting)</Label>
                    <Input value={calculatedValues.counting.toFixed(2)} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Sheets per Bundle</Label>
                    <Input value={calculatedValues.sheetsPerBundle.toFixed(2)} readOnly disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Sheets Required</Label>
                    <Input
                      value={calculatedValues.totalSheetsRequired.toLocaleString()}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ream Weight (kg)</Label>
                    <Input
                      value={calculatedValues.reamWeight.toFixed(2)}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t sticky bottom-0 bg-background z-10 flex flex-row justify-end gap-2 w-full">
              <DialogClose asChild>
                <Button variant="outline" disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateProgram} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? 'Saving...' : 'Create Program'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <CardContent>
            {renderProgramList()}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    
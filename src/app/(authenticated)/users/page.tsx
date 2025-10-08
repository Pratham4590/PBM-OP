
'use client';

import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, UserRole } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useUser, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

export default function UsersPage() {
  const firestore = useFirestore();
  const { user: currentUserAuth, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserDocRef = useMemoFirebase(
    () => (firestore && currentUserAuth ? doc(firestore, 'users', currentUserAuth.uid) : null),
    [firestore, currentUserAuth]
  );
  
  const { data: currentUserData, isLoading: isLoadingCurrentUserDoc } = useDoc<User>(currentUserDocRef);

  useEffect(() => {
    // This effect determines the final loading and admin status.
    if (!isAuthLoading && !isLoadingCurrentUserDoc) {
      // Once all loading is done, determine the admin status.
      setIsAdmin(currentUserData?.role === 'Admin');
      // And set the final loading state to false.
      setIsLoading(false);
    }
  }, [isAuthLoading, isLoadingCurrentUserDoc, currentUserData]);
  
  const allUsersQuery = useMemoFirebase(
    () => {
      // CRITICAL: Only define the query if loading is complete AND the user is an admin.
      if (isLoading || !isAdmin) {
        return null;
      }
      return collection(firestore!, 'users');
    },
    [firestore, isLoading, isAdmin]
  );

  const { data: users, isLoading: isLoadingAllUsers } = useCollection<User>(allUsersQuery);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (!firestore || !isAdmin) return;

    const userDocToUpdate = doc(firestore, 'users', userId);
    updateDocumentNonBlocking(userDocToUpdate, { role: newRole });
    toast({
        title: 'Role Updated',
        description: `User role has been successfully changed to ${newRole}.`,
    });
  };
  
  if (isLoading) {
     return (
       <>
        <PageHeader
          title="Users & Management"
          description="Manage user roles and permissions."
        />
        <Card>
           <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>
              Checking permissions and loading users...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please wait.</p>
          </CardContent>
        </Card>
       </>
     )
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader
          title="Users & Management"
          description="Manage user roles and permissions."
        />
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Only users with the 'Admin' role can manage other users.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users & Management"
        description="Manage user roles and permissions. (Admin only)"
      />
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>
            A list of all registered users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead className="w-[180px]">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAllUsers ? (
                   <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium whitespace-nowrap">{user.email}</TableCell>
                      <TableCell className="whitespace-nowrap">{user.displayName}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole: UserRole) =>
                            handleRoleChange(user.id, newRole)
                          }
                          disabled={user.id === currentUserAuth?.uid} // Can't change your own role
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Member">Member</SelectItem>
                            <SelectItem value="Operator">Operator</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

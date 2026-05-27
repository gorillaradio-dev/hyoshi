import { Head, router } from '@inertiajs/react';
import { Pause, Play, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { PageHeader } from '@/components/page-header';
import { StudentForm } from '@/components/student-form';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/hooks/use-tenant';
import TenantLayout from '@/layouts/tenant-layout';
import type { Student } from '@/types';

type Props = {
    student: Student;
};

export default function StudentsEdit({ student }: Props) {
    const tenant = useTenant();
    const prefix = `/app/${tenant.slug}`;

    return (
        <>
            <Head title={`Modifica ${student.first_name} ${student.last_name}`} />
            <div className="mx-auto w-full max-w-2xl p-4">
                <PageHeader
                    sticky
                    title={
                        <h1 className="text-2xl font-semibold">Modifica allievo</h1>
                    }
                    actions={
                        <Button type="submit" form="student-form">
                            Salva modifiche
                        </Button>
                    }
                />
                <StudentForm formId="student-form" student={student} submitLabel="Salva modifiche" />

                <Card className="mt-8 border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Zona pericolosa</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {student.effective_status !== 'suspended' && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-medium">Sospendi allievo</p>
                                    <p className="text-sm text-muted-foreground">
                                        L'allievo non potrà partecipare alle attività fino alla riattivazione.
                                    </p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline">
                                            <Pause data-icon="inline-start" />
                                            Sospendi
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Sospendere questo allievo?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {student.first_name} {student.last_name} verrà sospeso.
                                                Potrai riattivarlo in qualsiasi momento.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => router.put(`${prefix}/students/${student.id}/suspend`)}
                                            >
                                                Sospendi
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}

                        {student.effective_status === 'suspended' && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-medium">Riattiva allievo</p>
                                    <p className="text-sm text-muted-foreground">
                                        L'allievo tornerà al suo stato normale (in attesa o attivo in base all'iscrizione).
                                    </p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline">
                                            <Play data-icon="inline-start" />
                                            Riattiva
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Riattivare questo allievo?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {student.first_name} {student.last_name} verrà riattivato.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => router.put(`${prefix}/students/${student.id}/reactivate`)}
                                            >
                                                Riattiva
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-medium">Elimina allievo</p>
                                <p className="text-sm text-muted-foreground">
                                    L'allievo verrà rimosso dalla lista. Potrai recuperarlo in futuro se necessario.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 data-icon="inline-start" />
                                        Elimina
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Eliminare questo allievo?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {student.first_name} {student.last_name} verrà rimosso dalla lista.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => router.delete(`${prefix}/students/${student.id}`)}
                                        >
                                            Elimina
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

StudentsEdit.layout = (page: ReactElement<Props>) => {
    const { student } = page.props;
    return (
        <TenantLayout breadcrumbs={[
            { title: 'Allievi', href: 'students' },
            { title: `${student.last_name} ${student.first_name}`, href: `students/${student.id}` },
            { title: 'Modifica', href: '#' },
        ]}>
            {page}
        </TenantLayout>
    );
};

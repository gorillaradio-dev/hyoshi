import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, X } from 'lucide-react';
import {  useEffect, useRef, useState } from 'react';
import type {ReactElement} from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/hooks/use-tenant';
import TenantLayout from '@/layouts/tenant-layout';
import type { Group } from '@/types';

type StudentSummary = {
    id: string;
    first_name: string;
    last_name: string;
};

type Props = {
    group: Group & { students: StudentSummary[] };
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function GroupShow({ group }: Props) {
    const tenant = useTenant();
    const prefix = `/app/${tenant.slug}`;
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<StudentSummary[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    q: searchQuery,
                    exclude_group: group.id,
                });
                const response = await fetch(`${prefix}/students/search?${params}`, {
                    headers: { Accept: 'application/json' },
                });
                if (response.ok) {
                    const data: StudentSummary[] = await response.json();
                    setSearchResults(data);
                }
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    function handleAddStudent(studentId: string) {
        router.post(
            `${prefix}/students/${studentId}/groups`,
            { group_id: group.id },
            { preserveScroll: true },
        );
        setSearchQuery('');
        setSearchResults([]);
    }

    function handleRemoveStudent(studentId: string) {
        router.delete(`${prefix}/students/${studentId}/groups/${group.id}`, {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title={group.name} />
            <div className="mx-auto w-full max-w-2xl p-4">
                <PageHeader
                    sticky
                    title={
                        <div className="flex items-center gap-2">
                            <span
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: group.color }}
                                aria-hidden="true"
                            />
                            <h1 className="text-2xl font-semibold">{group.name}</h1>
                        </div>
                    }
                    actions={
                        <>
                            <Button variant="outline" onClick={() => window.history.back()}>
                                <ArrowLeft data-icon="inline-start" />
                                Indietro
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={`${prefix}/groups/${group.id}/edit`}>
                                    <Pencil data-icon="inline-start" />
                                    Modifica
                                </Link>
                            </Button>
                        </>
                    }
                />

                {/* Group Info */}
                <Card>
                    <CardContent className="flex flex-col gap-2 pt-5">
                        {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                        )}
                        <p className="text-sm">
                            <span className="text-muted-foreground">Tariffa mensile:</span>{' '}
                            <span className="font-medium">{formatCurrency(group.monthly_fee_amount)}</span>
                        </p>
                    </CardContent>
                </Card>

                {/* Members */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>
                            Allievi ({group.students.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {/* Search to add */}
                        <div className="relative">
                            <Input
                                placeholder="Cerca allievo da aggiungere..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                                    {searchResults.map((student) => (
                                        <button
                                            key={student.id}
                                            type="button"
                                            className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent"
                                            onClick={() => handleAddStudent(student.id)}
                                        >
                                            {student.last_name} {student.first_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {searching && searchQuery.length >= 2 && (
                                <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
                                    Ricerca in corso...
                                </div>
                            )}
                            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
                                    Nessun allievo trovato.
                                </div>
                            )}
                        </div>

                        {/* Student list */}
                        {group.students.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                Nessun allievo in questo gruppo.
                            </p>
                        ) : (
                            <ul className="flex flex-col divide-y">
                                {group.students.map((student) => (
                                    <li key={student.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                                        <Link
                                            href={`${prefix}/students/${student.id}`}
                                            className="text-sm hover:underline"
                                        >
                                            {student.last_name} {student.first_name}
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveStudent(student.id)}
                                        >
                                            <X data-icon="inline-start" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

GroupShow.layout = (page: ReactElement<Props>) => {
    const { group } = page.props;
    return (
        <TenantLayout
            breadcrumbs={[
                { title: 'Gruppi', href: 'groups' },
                { title: group.name, href: '#' },
            ]}
        >
            {page}
        </TenantLayout>
    );
};

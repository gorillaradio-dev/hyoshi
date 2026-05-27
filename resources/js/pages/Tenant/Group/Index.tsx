import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTenant } from '@/hooks/use-tenant';
import TenantLayout from '@/layouts/tenant-layout';
import type { Group } from '@/types';

type Props = {
    groups: Group[];
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function GroupIndex({ groups }: Props) {
    const tenant = useTenant();
    const prefix = `/app/${tenant.slug}`;

    return (
        <>
            <Head title="Gruppi" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <PageHeader
                    sticky
                    title={<h1 className="text-2xl font-semibold">Gruppi</h1>}
                    actions={
                        <Button asChild>
                            <Link href={`${prefix}/groups/create`}>
                                <Plus data-icon="inline-start" />
                                Nuovo gruppo
                            </Link>
                        </Button>
                    }
                />

                {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                        <p className="text-muted-foreground">Nessun gruppo ancora creato.</p>
                        <Button className="mt-4" asChild>
                            <Link href={`${prefix}/groups/create`}>
                                <Plus data-icon="inline-start" />
                                Crea il primo gruppo
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {groups.map((group) => (
                            <Card
                                key={group.id}
                                className="cursor-pointer transition-shadow hover:shadow-md"
                                onClick={() => router.visit(`${prefix}/groups/${group.id}`)}
                            >
                                <CardContent className="flex flex-col gap-3 pt-5">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="size-4 shrink-0 rounded-full"
                                            style={{ backgroundColor: group.color }}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate font-semibold">{group.name}</span>
                                    </div>

                                    {group.description && (
                                        <p className="line-clamp-2 text-sm text-muted-foreground">
                                            {group.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between gap-2">
                                        <Badge variant="secondary">
                                            {group.students_count ?? 0}{' '}
                                            {(group.students_count ?? 0) === 1 ? 'allievo' : 'allievi'}
                                        </Badge>
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {formatCurrency(group.monthly_fee_amount)}/mese
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

GroupIndex.layout = (page: ReactElement<Props>) => (
    <TenantLayout breadcrumbs={[{ title: 'Gruppi', href: '#' }]}>
        {page}
    </TenantLayout>
);

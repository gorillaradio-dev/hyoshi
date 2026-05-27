import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { GroupForm } from '@/components/group-form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/hooks/use-tenant';
import TenantLayout from '@/layouts/tenant-layout';
import type { Group } from '@/types';

type Props = {
    group: Group;
};

export default function GroupEdit({ group }: Props) {
    const tenant = useTenant();
    const prefix = `/app/${tenant.slug}`;

    function handleDelete() {
        if (!confirm(`Eliminare il gruppo "${group.name}"? Questa azione non può essere annullata.`)) {
            return;
        }
        router.delete(`${prefix}/groups/${group.id}`);
    }

    return (
        <>
            <Head title={`Modifica ${group.name}`} />
            <div className="mx-auto w-full max-w-2xl p-4">
                <PageHeader
                    sticky
                    title={<h1 className="text-2xl font-semibold">Modifica gruppo</h1>}
                    actions={
                        <>
                            <Button variant="outline" onClick={() => window.history.back()}>
                                <ArrowLeft data-icon="inline-start" />
                                Indietro
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                <Trash2 data-icon="inline-start" />
                                Elimina
                            </Button>
                        </>
                    }
                />

                <GroupForm group={group} submitLabel="Salva modifiche" />
            </div>
        </>
    );
}

GroupEdit.layout = (page: ReactElement<Props>) => {
    const { group } = page.props;
    return (
        <TenantLayout breadcrumbs={[
            { title: 'Gruppi', href: 'groups' },
            { title: group.name, href: '#' },
        ]}>
            {page}
        </TenantLayout>
    );
};

import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { GroupForm } from '@/components/group-form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import TenantLayout from '@/layouts/tenant-layout';

export default function GroupCreate() {

    return (
        <>
            <Head title="Nuovo gruppo" />
            <div className="mx-auto w-full max-w-2xl p-4">
                <PageHeader
                    sticky
                    title={<h1 className="text-2xl font-semibold">Nuovo gruppo</h1>}
                    actions={
                        <Button variant="outline" onClick={() => window.history.back()}>
                            <ArrowLeft data-icon="inline-start" />
                            Indietro
                        </Button>
                    }
                />
                <GroupForm submitLabel="Crea gruppo" />
            </div>
        </>
    );
}

GroupCreate.layout = (page: ReactNode) => (
    <TenantLayout breadcrumbs={[
        { title: 'Gruppi', href: 'groups' },
        { title: 'Nuovo gruppo', href: '#' },
    ]}>
        {page}
    </TenantLayout>
);

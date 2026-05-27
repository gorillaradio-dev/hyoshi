import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { StudentForm } from '@/components/student-form';
import TenantLayout from '@/layouts/tenant-layout';

export default function StudentsCreate() {
    return (
        <>
            <Head title="Nuovo allievo" />
            <div className="mx-auto w-full max-w-2xl p-4">
                <h1 className="mb-6 text-2xl font-semibold">Nuovo allievo</h1>
                <StudentForm submitLabel="Aggiungi allievo" />
            </div>
        </>
    );
}

StudentsCreate.layout = (page: ReactNode) => (
    <TenantLayout breadcrumbs={[
        { title: 'Allievi', href: 'students' },
        { title: 'Nuovo', href: '#' },
    ]}>
        {page}
    </TenantLayout>
);

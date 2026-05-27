import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import TenantLayout from '@/layouts/tenant-layout';

export default function TenantDashboard() {
    const tenant = useTenant();

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
                <h1 className="text-2xl font-semibold">{tenant.name}</h1>
                <p className="text-muted-foreground">Dashboard in costruzione</p>
            </div>
        </>
    );
}

TenantDashboard.layout = (page: ReactNode) => <TenantLayout>{page}</TenantLayout>;

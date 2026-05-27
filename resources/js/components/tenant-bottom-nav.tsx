import { Link } from '@inertiajs/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useTenant } from '@/hooks/use-tenant';
import { getTenantNavItems } from '@/lib/tenant-nav';
import { cn } from '@/lib/utils';

export function TenantBottomNav() {
    const tenant = useTenant();
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const items = getTenantNavItems(tenant.slug);

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)]">
            <div className="flex h-16 items-center justify-around">
                {items.map((item) => {
                    const active = isCurrentOrParentUrl(item.href);
                    return (
                        <Link
                            key={item.href as string}
                            href={item.href}
                            className={cn(
                                'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                                active
                                    ? 'text-primary'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {item.icon && <item.icon className="size-5" />}
                            <span>{item.title}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    title: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    sticky?: boolean;
    inline?: boolean;
};

export function PageHeader({ title, actions, children, sticky = false, inline = false }: Props) {
    return (
        <div
            className={cn(
                '-mx-4 mb-6 border-b bg-background px-4 py-3',
                sticky && 'sticky top-0 z-10',
            )}
        >
            <div
                className={cn(
                    'flex gap-3',
                    inline
                        ? 'items-center justify-between'
                        : 'flex-col sm:flex-row sm:items-center sm:justify-between',
                )}
            >
                <div className="min-w-0">{title}</div>
                {actions && (
                    <div
                        className={cn(
                            'flex gap-2',
                            inline
                                ? 'shrink-0 items-center'
                                : 'w-full justify-between sm:w-auto sm:justify-end',
                        )}
                    >
                        {actions}
                    </div>
                )}
            </div>
            {children && <div className="mt-3">{children}</div>}
        </div>
    );
}

import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { index as budgetsIndex, create as budgetsCreate, show as budgetShow } from '@/actions/App/Http/Controllers/BudgetController';

interface Budget {
    id: number;
    month: string;
    notes: string | null;
}

interface Props {
    budgets: Budget[];
}

function formatMonth(month: string): string {
    return new Date(month + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
    });
}

export default function BudgetsIndex({ budgets }: Props) {
    const { currentTeam } = usePage().props;

    return (
        <>
            <Head title="Budgets" />
            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Budgets</h1>
                    {currentTeam && (
                        <Button asChild>
                            <Link href={budgetsCreate.url(currentTeam.slug)}>New Budget</Link>
                        </Button>
                    )}
                </div>

                {budgets.length === 0 ? (
                    <p className="text-muted-foreground">No budgets yet. Create one to get started.</p>
                ) : (
                    <div className="space-y-2">
                        {budgets.map((budget) => (
                            currentTeam && (
                                <Card key={budget.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                                    <CardContent className="py-4">
                                        <Link
                                            href={budgetShow.url({ current_team: currentTeam.slug, budget: budget.id })}
                                            className="flex items-center justify-between"
                                        >
                                            <span className="font-medium">{formatMonth(budget.month)}</span>
                                            {budget.notes && (
                                                <span className="text-sm text-muted-foreground">{budget.notes}</span>
                                            )}
                                        </Link>
                                    </CardContent>
                                </Card>
                            )
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

BudgetsIndex.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Budgets',
            href: props.currentTeam ? budgetsIndex.url(props.currentTeam.slug) : '/',
        },
    ],
});

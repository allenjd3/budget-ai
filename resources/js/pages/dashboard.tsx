import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardController from '@/actions/App/Http/Controllers/DashboardController';
import { create as budgetCreate, show as budgetShow, index as budgetsIndex } from '@/actions/App/Http/Controllers/BudgetController';

interface Category {
    id: number;
    name: string;
    color: string | null;
}

interface BudgetLine {
    id: number;
    allocated_cents: number;
    category: Category;
}

interface Budget {
    id: number;
    month: string;
    notes: string | null;
    lines?: BudgetLine[];
}

interface Props {
    currentMonthBudget: Budget | null;
    recentBudgets: Budget[];
}

function formatMonth(month: string): string {
    return new Date(month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function Dashboard({ currentMonthBudget, recentBudgets }: Props) {
    const { currentTeam } = usePage().props;

    if (!currentTeam) return null;

    const totalAllocated = currentMonthBudget?.lines?.reduce((sum, l) => sum + l.allocated_cents, 0) ?? 0;

    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6 p-4">

                {/* Current month budget */}
                {currentMonthBudget ? (
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>{formatMonth(currentMonthBudget.month)}</CardTitle>
                            <Button asChild variant="outline" size="sm">
                                <Link href={budgetShow.url({ current_team: currentTeam.slug, budget: currentMonthBudget.id })}>
                                    View Budget
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {currentMonthBudget.lines && currentMonthBudget.lines.length > 0 ? (
                                <div className="space-y-2">
                                    {currentMonthBudget.lines.map((line) => (
                                        <div key={line.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                {line.category.color && (
                                                    <span
                                                        className="inline-block size-2.5 rounded-full"
                                                        style={{ backgroundColor: line.category.color }}
                                                    />
                                                )}
                                                <span>{line.category.name}</span>
                                            </div>
                                            <span className="text-muted-foreground">{formatCurrency(line.allocated_cents)}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
                                        <span>Total allocated</span>
                                        <span>{formatCurrency(totalAllocated)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">No budget lines yet.</p>
                                    <Button asChild size="sm">
                                        <Link href={budgetShow.url({ current_team: currentTeam.slug, budget: currentMonthBudget.id })}>
                                            Add Lines
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="flex items-center justify-between py-6">
                            <div>
                                <p className="font-medium">No budget for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                <p className="text-sm text-muted-foreground">Create one to start tracking your spending.</p>
                            </div>
                            <Button asChild>
                                <Link href={budgetCreate.url(currentTeam.slug)}>Create Budget</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Recent budgets */}
                {recentBudgets.length > 0 && (
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Budgets</CardTitle>
                            <Button asChild variant="ghost" size="sm">
                                <Link href={budgetsIndex.url(currentTeam.slug)}>View all</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <ul className="divide-y">
                                {recentBudgets.map((budget) => (
                                    <li key={budget.id}>
                                        <Link
                                            href={budgetShow.url({ current_team: currentTeam.slug, budget: budget.id })}
                                            className="flex items-center justify-between py-2 text-sm hover:text-primary"
                                        >
                                            <span>{formatMonth(budget.month)}</span>
                                            {budget.notes && (
                                                <span className="text-muted-foreground">{budget.notes}</span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

Dashboard.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: props.currentTeam ? DashboardController(props.currentTeam.slug).url : '/',
        },
    ],
});

import { Head, Form, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store as budgetsStore, index as budgetsIndex, create as budgetsCreate } from '@/actions/App/Http/Controllers/BudgetController';

export default function BudgetsCreate() {
    const { currentTeam } = usePage().props;

    if (!currentTeam) {
        return null;
    }

    return (
        <>
            <Head title="New Budget" />
            <div className="p-4">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>New Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            action={budgetsStore.url(currentTeam.slug)}
                            method="post"
                            className="space-y-4"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="month">Month</Label>
                                        <Input
                                            id="month"
                                            type="month"
                                            name="month"
                                        />
                                        {errors.month && (
                                            <p className="text-sm text-destructive">{errors.month}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="notes">
                                            Notes
                                            <span className="ml-1 text-muted-foreground">(optional)</span>
                                        </Label>
                                        <textarea
                                            id="notes"
                                            name="notes"
                                            rows={3}
                                            className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                        {errors.notes && (
                                            <p className="text-sm text-destructive">{errors.notes}</p>
                                        )}
                                    </div>

                                    <Button type="submit" disabled={processing} className="w-full">
                                        {processing ? 'Creating…' : 'Create Budget'}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

BudgetsCreate.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Budgets',
            href: props.currentTeam ? budgetsIndex.url(props.currentTeam.slug) : '/',
        },
        {
            title: 'New Budget',
            href: props.currentTeam ? budgetsCreate.url(props.currentTeam.slug) : '/',
        },
    ],
});

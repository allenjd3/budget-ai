import { useState } from 'react';
import { Head, Form, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    index as transactionsIndex,
    create as transactionCreate,
    store as transactionStore,
} from '@/actions/App/Http/Controllers/TransactionController';

interface Category {
    id: number;
    name: string;
    is_income: boolean;
}

interface Props {
    categories: Category[];
}

export default function TransactionsCreate({ categories }: Props) {
    const { currentTeam } = usePage().props;
    const [amountCents, setAmountCents] = useState(0);

    if (!currentTeam) {
        return null;
    }

    const expenseCategories = categories.filter((c) => !c.is_income);
    const incomeCategories = categories.filter((c) => c.is_income);

    return (
        <>
            <Head title="New Transaction" />
            <div className="p-4">
                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle>New Transaction</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            action={transactionStore.url(currentTeam.slug)}
                            method="post"
                            className="space-y-4"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="transacted_at">Date</Label>
                                        <Input
                                            id="transacted_at"
                                            type="date"
                                            name="transacted_at"
                                        />
                                        {errors.transacted_at && (
                                            <p className="text-sm text-destructive">{errors.transacted_at}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            type="text"
                                            name="description"
                                            placeholder="e.g. Grocery store"
                                        />
                                        {errors.description && (
                                            <p className="text-sm text-destructive">{errors.description}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="amount_dollars">Amount</Label>
                                        <Input
                                            id="amount_dollars"
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g. -25.00 for expense, 1500.00 for income"
                                            onChange={(e) =>
                                                setAmountCents(Math.round(parseFloat(e.target.value || '0') * 100))
                                            }
                                        />
                                        <input type="hidden" name="amount_cents" value={amountCents} readOnly />
                                        {errors.amount_cents && (
                                            <p className="text-sm text-destructive">{errors.amount_cents}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="category_id">Category</Label>
                                        <select
                                            id="category_id"
                                            name="category_id"
                                            className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
                                        >
                                            <option value="">No category</option>
                                            {expenseCategories.length > 0 && (
                                                <optgroup label="Expenses">
                                                    {expenseCategories.map((cat) => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {incomeCategories.length > 0 && (
                                                <optgroup label="Income">
                                                    {incomeCategories.map((cat) => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                        {errors.category_id && (
                                            <p className="text-sm text-destructive">{errors.category_id}</p>
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
                                            rows={2}
                                            className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                        {errors.notes && (
                                            <p className="text-sm text-destructive">{errors.notes}</p>
                                        )}
                                    </div>

                                    <Button type="submit" disabled={processing} className="w-full">
                                        {processing ? 'Saving…' : 'Save Transaction'}
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

TransactionsCreate.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Transactions',
            href: props.currentTeam ? transactionsIndex.url(props.currentTeam.slug) : '/',
        },
        {
            title: 'New Transaction',
            href: props.currentTeam ? transactionCreate.url(props.currentTeam.slug) : '/',
        },
    ],
});

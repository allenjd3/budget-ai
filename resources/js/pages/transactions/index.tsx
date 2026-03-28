import { Head, Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    index as transactionsIndex,
    create as transactionCreate,
    edit as transactionEdit,
} from '@/actions/App/Http/Controllers/TransactionController';

interface Category {
    id: number;
    name: string;
    color: string | null;
    is_income: boolean;
}

interface Transaction {
    id: number;
    transacted_at: string;
    description: string;
    amount_cents: number;
    notes: string | null;
    category: Category | null;
}

interface Paginator<T> {
    data: T[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Props {
    transactions: Paginator<Transaction>;
    categories: Category[];
    filters: { category_id?: string };
}

function formatDate(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function TransactionsIndex({ transactions, categories, filters }: Props) {
    const { currentTeam } = usePage().props;

    if (!currentTeam) {
        return null;
    }

    function filterByCategory(categoryId: string) {
        router.get(
            transactionsIndex.url(currentTeam!.slug),
            categoryId ? { category_id: categoryId } : {},
            { preserveState: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Transactions" />
            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Transactions</h1>
                    <Button asChild>
                        <Link href={transactionCreate.url(currentTeam.slug)}>New Transaction</Link>
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <select
                        value={filters.category_id ?? ''}
                        onChange={(e) => filterByCategory(e.target.value)}
                        className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
                    >
                        <option value="">All categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {transactions.data.length === 0 ? (
                    <p className="text-muted-foreground">No transactions yet.</p>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                        <th className="px-4 py-3 font-medium">Category</th>
                                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {transactions.data.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-muted/50">
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                {formatDate(tx.transacted_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span>{tx.description}</span>
                                                {tx.notes && (
                                                    <p className="text-xs text-muted-foreground">{tx.notes}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {tx.category ? (
                                                    <div className="flex items-center gap-2">
                                                        {tx.category.color && (
                                                            <span
                                                                className="inline-block size-2.5 rounded-full"
                                                                style={{ backgroundColor: tx.category.color }}
                                                            />
                                                        )}
                                                        <span>{tx.category.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">Uncategorized</span>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${tx.amount_cents >= 0 ? 'text-green-600' : ''}`}>
                                                {formatCurrency(tx.amount_cents)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={transactionEdit.url({ current_team: currentTeam.slug, transaction: tx.id })}>
                                                        Edit
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {(transactions.prev_page_url || transactions.next_page_url) && (
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            disabled={!transactions.prev_page_url}
                            onClick={() => transactions.prev_page_url && router.visit(transactions.prev_page_url)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            disabled={!transactions.next_page_url}
                            onClick={() => transactions.next_page_url && router.visit(transactions.next_page_url)}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

TransactionsIndex.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Transactions',
            href: props.currentTeam ? transactionsIndex.url(props.currentTeam.slug) : '/',
        },
    ],
});

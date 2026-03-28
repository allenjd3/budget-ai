import { useState } from 'react';
import { Head, Form, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { store as budgetsStore, index as budgetsIndex, create as budgetsCreate } from '@/actions/App/Http/Controllers/BudgetController';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonthPicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const today = new Date();
    const [year, setYear] = useState(value ? parseInt(value.slice(0, 4)) : today.getFullYear());
    const [open, setOpen] = useState(false);

    const selectedYear = value ? parseInt(value.slice(0, 4)) : null;
    const selectedMonth = value ? parseInt(value.slice(5, 7)) - 1 : null;

    const label =
        selectedYear !== null && selectedMonth !== null
            ? `${MONTHS[selectedMonth]} ${selectedYear}`
            : 'Pick a month';

    function select(monthIndex: number) {
        const mm = String(monthIndex + 1).padStart(2, '0');
        onChange(`${year}-${mm}-01`);
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 font-normal"
                >
                    <CalendarIcon className="size-4 text-muted-foreground" />
                    <span className={value ? '' : 'text-muted-foreground'}>{label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
                {/* Year navigation */}
                <div className="mb-3 flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setYear((y) => y - 1)}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm font-medium">{year}</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setYear((y) => y + 1)}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>

                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1">
                    {MONTHS.map((name, i) => {
                        const isSelected = year === selectedYear && i === selectedMonth;
                        return (
                            <Button
                                key={name}
                                type="button"
                                variant={isSelected ? 'default' : 'ghost'}
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => select(i)}
                            >
                                {name}
                            </Button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}

interface PreviousBudget {
    id: number;
    month: string;
}

interface Props {
    previousBudget: PreviousBudget | null;
}

function formatMonth(month: string): string {
    return new Date(month.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
    });
}

export default function BudgetsCreate({ previousBudget }: Props) {
    const { currentTeam } = usePage().props;
    const [month, setMonth] = useState('');
    const [copyPrevious, setCopyPrevious] = useState(true);

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
                                        <Label>Month</Label>
                                        <MonthPicker value={month} onChange={setMonth} />
                                        <input type="hidden" name="month" value={month} readOnly />
                                        {errors.month && (
                                            <p className="text-sm text-destructive">{errors.month}</p>
                                        )}
                                    </div>

                                    {previousBudget && (
                                        <label className="flex cursor-pointer items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                name="copy_from_budget_id"
                                                value={previousBudget.id}
                                                checked={copyPrevious}
                                                onChange={(e) => setCopyPrevious(e.target.checked)}
                                                className="size-4 rounded border-input accent-primary"
                                            />
                                            <span className="text-sm">
                                                Copy allocations from{' '}
                                                <span className="font-medium">{formatMonth(previousBudget.month)}</span>
                                            </span>
                                        </label>
                                    )}

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

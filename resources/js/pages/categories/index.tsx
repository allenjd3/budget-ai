import { useState } from 'react';
import { Head, Form, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    index as categoriesIndex,
    store as categoriesStore,
    update as categoryUpdate,
    destroy as categoryDestroy,
} from '@/actions/App/Http/Controllers/CategoryController';

interface Category {
    id: number;
    name: string;
    color: string | null;
    is_income: boolean;
}

interface Props {
    categories: Category[];
}

const COLOR_PRESETS = [
    '#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444',
    '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#0ea5e9',
    '#84cc16', '#10b981', '#6b7280', '#9ca3af',
];

function ColorPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
    const [color, setColor] = useState(defaultValue);
    return (
        <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${color === preset ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: preset }}
                        onClick={() => setColor(preset)}
                    />
                ))}
            </div>
            <input type="hidden" name={name} value={color} readOnly />
        </div>
    );
}

function CategoryRow({ category, teamSlug }: { category: Category; teamSlug: string }) {
    const [editing, setEditing] = useState(false);

    if (!editing) {
        return (
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                    {category.color && (
                        <span className="inline-block size-3 rounded-full" style={{ backgroundColor: category.color }} />
                    )}
                    <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
                        Edit
                    </Button>
                    <Form
                        action={categoryDestroy.url({ current_team: teamSlug, category: category.id })}
                        method="delete"
                        className="inline"
                    >
                        {({ processing }) => (
                            <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                disabled={processing}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                Delete
                            </Button>
                        )}
                    </Form>
                </div>
            </div>
        );
    }

    return (
        <Form
            action={categoryUpdate.url({ current_team: teamSlug, category: category.id })}
            method="patch"
            onSuccess={() => setEditing(false)}
            className="rounded-md border bg-muted/30 p-3"
        >
            {({ errors, processing }) => (
                <div className="space-y-3">
                    <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                            <Label htmlFor={`name-${category.id}`}>Name</Label>
                            <Input
                                id={`name-${category.id}`}
                                name="name"
                                defaultValue={category.name}
                                autoFocus
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor={`income-${category.id}`}>Type</Label>
                            <select
                                id={`income-${category.id}`}
                                name="is_income"
                                defaultValue={category.is_income ? '1' : '0'}
                                className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
                            >
                                <option value="0">Expense</option>
                                <option value="1">Income</option>
                            </select>
                        </div>
                    </div>
                    <ColorPicker name="color" defaultValue={category.color ?? '#6366f1'} />
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={processing}>
                            {processing ? 'Saving…' : 'Save'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </Form>
    );
}

export default function CategoriesIndex({ categories }: Props) {
    const { currentTeam } = usePage().props;

    if (!currentTeam) return null;

    const expenses = categories.filter((c) => !c.is_income);
    const income = categories.filter((c) => c.is_income);

    return (
        <>
            <Head title="Categories" />
            <div className="space-y-6 p-4">
                <h1 className="text-2xl font-semibold">Categories</h1>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Expenses</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y">
                            {expenses.length === 0 && (
                                <p className="py-2 text-sm text-muted-foreground">No expense categories yet.</p>
                            )}
                            {expenses.map((cat) => (
                                <CategoryRow key={cat.id} category={cat} teamSlug={currentTeam.slug} />
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Income</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y">
                            {income.length === 0 && (
                                <p className="py-2 text-sm text-muted-foreground">No income categories yet.</p>
                            )}
                            {income.map((cat) => (
                                <CategoryRow key={cat.id} category={cat} teamSlug={currentTeam.slug} />
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-base">Add Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            action={categoriesStore.url(currentTeam.slug)}
                            method="post"
                            resetOnSuccess
                            className="space-y-3"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="flex gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <Label htmlFor="new-name">Name</Label>
                                            <Input id="new-name" name="name" placeholder="e.g. Subscriptions" />
                                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="new-is-income">Type</Label>
                                            <select
                                                id="new-is-income"
                                                name="is_income"
                                                className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
                                            >
                                                <option value="0">Expense</option>
                                                <option value="1">Income</option>
                                            </select>
                                        </div>
                                    </div>
                                    <ColorPicker name="color" defaultValue="#6366f1" />
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Adding…' : 'Add Category'}
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

CategoriesIndex.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Categories',
            href: props.currentTeam ? categoriesIndex.url(props.currentTeam.slug) : '/',
        },
    ],
});

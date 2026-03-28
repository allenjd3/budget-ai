import { Head } from '@inertiajs/react';

interface Category {
    id: number;
    name: string;
    color: string | null;
    is_income: boolean;
}

interface Props {
    categories: Category[];
}

export default function CategoriesIndex({ categories }: Props) {
    return (
        <>
            <Head title="Categories" />
            <div className="p-4">
                <h1 className="text-2xl font-semibold">Categories</h1>
                <ul className="mt-4 space-y-2">
                    {categories.map((category) => (
                        <li key={category.id} className="flex items-center gap-2">
                            {category.color && (
                                <span
                                    className="inline-block size-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                />
                            )}
                            <span>{category.name}</span>
                            {category.is_income && (
                                <span className="text-xs text-green-600">Income</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

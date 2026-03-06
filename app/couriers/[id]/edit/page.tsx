/**
 * app/couriers/[id]/edit/page.tsx
 * Dark mode — style FleetOps
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCourierDetail }    from "@/modules/couriers/queries/courier.queries";
import { getCourierDisplayName } from "@/core/entities/courier.entity";
import { CourierForm } from "@/modules/couriers/components/CourierForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCourierPage({ params }: PageProps) {
  const { id } = await params;
  const { courier, error } = await fetchCourierDetail(id);

  if (!courier || error) notFound();

  const displayName = getCourierDisplayName(courier);

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/couriers" className="text-zinc-500 hover:text-zinc-300 transition-colors">Livreurs</Link>
        <span className="text-zinc-700">/</span>
        <Link href={`/couriers/${id}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">{displayName}</Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300">Modifier</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Modifier {displayName}</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Les modifications sont appliquées immédiatement.</p>
      </div>

      {/* Formulaire */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="h-0.5 w-full bg-indigo-500" />
        <div className="p-6">
          <CourierForm mode="edit" courier={courier} />
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Cube } from '@/types';
import { getCubes } from '@/lib/storage';
import CubeForm from '@/components/CubeForm';

export default function CubeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cube, setCube] = useState<Cube | null | undefined>(undefined);

  useEffect(() => {
    const found = getCubes().find((c) => c.id === id) ?? null;
    setCube(found);
  }, [id]);

  if (cube === undefined) return null;
  if (cube === null) return <div className="p-6 text-gray-400">큐브를 찾을 수 없어요.</div>;

  return <CubeForm cube={cube} />;
}

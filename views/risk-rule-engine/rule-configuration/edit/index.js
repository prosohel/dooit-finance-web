'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, PageTitle, PageDescription } from '@/components/common'
import RuleForm from '../form'

const LIST_PATH = '/dashboard/client/risk-rule-engine/rule-configuration'

export default function RuleEdit({ id }) {
  const router = useRouter()
  return (
    <div>
      <PageHeader>
        <PageTitle>Edit Rule</PageTitle>
        <PageDescription>Update this rule&apos;s configuration.</PageDescription>
      </PageHeader>
      <RuleForm
        mode="edit"
        id={id}
        onCancel={() => router.push(`${LIST_PATH}/${id}`)}
        onSaved={() => router.push(`${LIST_PATH}/${id}`)}
      />
    </div>
  )
}

import { notFound } from 'next/navigation'
import WorkflowBuilder from '@/views/workflow-studio/builder'
import { getWorkflowById } from '../actions'

export default async function WorkflowBuilderPage({ params }) {
  const { id } = await params
  const res = await getWorkflowById(id)

  if (!res?.success) {
    notFound()
  }

  return <WorkflowBuilder workflow={res.data} />
}

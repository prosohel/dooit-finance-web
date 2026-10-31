import RuleBackTest from '@/views/risk-rule-engine/back-test'

export default async function Page({ searchParams }) {
  const { rule } = await searchParams
  return <RuleBackTest initialRuleId={rule} />
}

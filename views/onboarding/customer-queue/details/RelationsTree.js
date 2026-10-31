import { PartyTreeGraph } from "./party-tree.graph";
import { GraphLegend } from "./graph-legend";
import { useState, useRef, useEffect } from "react";

import { Users, ArrowLeftRight, Radar } from "lucide-react";
import partyEntities from "./demo.json";
import { Input } from "@/components/ui/input";
import { AlertsTable } from "./AlertsTable";
import { Osiint } from "./Osiint";
import TransactionTable from "./TransactionTable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getCustomerRelationsGraph } from "@/app/dashboard/client/onboarding/customer-queue/actions";
import { transformToGraph } from "./d3/lib/transformgraphData";
import NetworkGraph from "./d3/Networkgraph";
import NodeDetailPanel from "./d3/NodeDetailPanel";
const FILTERS = [
  // { mode: "all", label: "All", icon: Network },
  { mode: "relations", label: "Relations", icon: Users },
  { mode: "transactions", label: "Transactions", icon: ArrowLeftRight },
  // { mode: "ip", label: "IP Addresses", icon: Globe },
];
const graphData = transformToGraph(partyEntities);
function flatten(node, parent, out) {
  out.push({
    name: node.partyName,
    partyId: node.partyId,
    partyType: node.partyType,
    role: node.role,
    pepFlag: node.pepFlag ?? false,
    riskRating: node.riskRating,
    status: node.status,
    ipAddress: node.ipAddress,
    parentName: parent,
    relation: node.relationshipToParent ?? "self",
    relationType: node.relationType ?? "FAMILY",
    ownershipPercentage: node.ownershipPercentage,
    transactions: node.transactions,
  });
  for (const child of node?.children) flatten(child, node.partyName, out);
}
const _flat = [];
flatten(partyEntities, null, _flat);
const entities = _flat;

export function RelationsTree({ details }) {
  const [relations, setRelations] = useState([]);
  const [filterMode, setFilterMode] = useState("relations");
  const [osintOpen, setOsintOpen] = useState(false);
  const expandAllRef = useRef(null);
  const collapseAllRef = useRef(null);
  const [selected, setSelected] = useState(null);

  // useEffect(() => {
  //   getCustomerRelationsGraph(details._id).then((res) => {
  //     console.log("relations graph res", res);
  //     setRelations(res);
  //   });
  // }, [details.id]);
  return (
    <main className="min-h-screen relative ">
      <Sheet open={osintOpen} onOpenChange={setOsintOpen}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[860px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Radar className="size-4 text-primary" />
              OSINT Report
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <Osiint />
          </div>
        </SheetContent>
      </Sheet>

      <div className=" ">
        {/* Header */}
        <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-end">
          <div className="flex items-center gap-3">
            {/* Expand / Collapse buttons */}
            <button
              type="button"
              onClick={() => expandAllRef.current?.()}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={() => collapseAllRef.current?.()}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Collapse All
            </button>
            <button
              type="button"
              onClick={() => setOsintOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <Radar className="size-3.5" />
              OSINT
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-12 gap-4">
          <div className="col-span-3 space-y-4 sticky top-20 bg-white border rounded-md p-4 h-max overflow-y-auto">
            <AlertsTable />
            {/* <Osiint /> */}
          </div>
          {/* Tabs */}

          <div className="col-span-9 relative  ">
            <TransactionTable />
            <div className=" relative ">
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                {/* Filter bar + Legend */}
                <div className="border-b border-border px-5 py-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-secondary/50">
                      {FILTERS.map(({ mode: m, label, icon: Icon }) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFilterMode(m)}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                            filterMode === m
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <GraphLegend filterMode={filterMode} />
                    <Input type="text" placeholder="Search" className="w-64" />
                  </div>
                </div>
                <div className="">
                  {/* <PartyTreeGraph
                    entities={entities}
                    filterMode={filterMode}
                    expandAllRef={expandAllRef}
                    collapseAllRef={collapseAllRef}
                    // relations={relations}
                    details={details}
                  /> */}
                  {/* <D3Canvas /> */}
                  <NetworkGraph data={graphData} onNodeClick={setSelected} />
                  {selected && (
                    <NodeDetailPanel node={selected} onClose={() => setSelected(null)} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

//  <Tabs defaultValue="graph" className="w-full col-span-9">
//    <TabsList className="mb-4">
//      <TabsTrigger value="graph">Graph View</TabsTrigger>

//      <TabsTrigger value="diagram">Tree View</TabsTrigger>
//    </TabsList>

//    {/* Graph View Tab */}
//    <TabsContent value="graph" className="mt-0">
//      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
//        {/* Graph */}
//      </div>
//    </TabsContent>

//    {/* Tree View Tab */}
//    <TabsContent value="tree" className="mt-0">
//      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
//        {/* Legend Bar */}
//        <div className="border-b border-border px-6 py-3">
//          <GraphLegend viewMode={viewMode} />
//        </div>

//        {/* Tree */}
//        <div className="h-[680px]">
//          {/* <PartyTreeView data={dummyData} viewMode={viewMode} /> */}
//        </div>
//      </div>
//    </TabsContent>

//    {/* Node Diagram Tab */}
//    <TabsContent value="diagram" className="mt-0">
//      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
//        {/* Legend Bar */}
//        <div className="border-b border-border px-6 py-3">
//          <GraphLegend viewMode={viewMode} />
//        </div>

//        {/* Diagram */}
//        <div className="h-[680px]">
//          <PartyNodeDiagram entities={entities} />
//        </div>
//      </div>
//    </TabsContent>
//  </Tabs>;

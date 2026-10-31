import Ecdd from '@/views/monitoring-and-cases/case-details/Ecdd';
import React from 'react';

// Standalone ECDD Review, addressed by the report's own id — the ECDD list opens
// reports here instead of routing through the originating alert or case.
const EcddViewPage = async ({ params }) => {
    const { id } = await params;
    return <Ecdd ecddId={id} />;
};

export default EcddViewPage;

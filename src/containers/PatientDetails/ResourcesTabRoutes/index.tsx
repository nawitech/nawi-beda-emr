import { Segmented } from 'antd';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

import { ResourceList } from '../ResourceList';
import { AvailableResourceTypesStr } from '../types';
import { getResourceConfigData } from '../utils';

// Clinical reading order: what a clinician looks for first comes first. Every entry already
// has a title and icon configured in ../utils.tsx — this nav is what those were written for.
const RESOURCE_TYPES: AvailableResourceTypesStr[] = [
    'Condition',
    'Observation',
    'AllergyIntolerance',
    'MedicationRequest',
    'MedicationStatement',
    'Procedure',
    'Immunization',
    'RelatedPerson',
];

const DEFAULT_RESOURCE_TYPE: AvailableResourceTypesStr = 'Condition';

function ResourcesNav() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const last = location.pathname.split('/').pop() as AvailableResourceTypesStr;
    const current = RESOURCE_TYPES.includes(last) ? last : DEFAULT_RESOURCE_TYPE;

    return (
        <>
            <Segmented<string>
                value={current}
                onChange={(value) => navigate(`/patients/${id}/resources/${value}`)}
                options={RESOURCE_TYPES.map((resourceType) => {
                    const { title, icon } = getResourceConfigData(resourceType, 'uberList');
                    return { value: resourceType, label: title, icon };
                })}
                style={{ marginBottom: 16, overflowX: 'auto', maxWidth: '100%' }}
            />
            <Outlet />
        </>
    );
}

export function ResourcesTabRoutes() {
    return (
        <Routes>
            <Route element={<ResourcesNav />}>
                <Route path="/" element={<Navigate to={DEFAULT_RESOURCE_TYPE} replace />} />
                <Route path="/:resourceType" element={<ResourceList />} />
            </Route>
        </Routes>
    );
}

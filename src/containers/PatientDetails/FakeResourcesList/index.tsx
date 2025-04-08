import { Resource } from "fhir/r4b";
import { useParams, Route, Routes, Navigate } from 'react-router-dom';

import { ResourceListPage } from '@beda.software/emr/dist/uberComponents/ResourceListPage/index';

import { AvailableResourceTypesStr } from '../types';
import { getResourceConfigData } from '../utils';
import { ResourceList } from '../ResourceList'


export function FakeResourcesList() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="Condition" replace />} />
            <Route path="/:resourceType" element={<ResourceList />} />
        </Routes>
    );
};

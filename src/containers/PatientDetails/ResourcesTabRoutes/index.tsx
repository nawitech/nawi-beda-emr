import { Route, Routes, Navigate } from 'react-router-dom';

import { ResourceList } from '../ResourceList'


export function ResourcesTabRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="Condition" replace />} />
            <Route path="/:resourceType" element={<ResourceList />} />
        </Routes>
    );
};

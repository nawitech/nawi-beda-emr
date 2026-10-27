import { t } from '@lingui/macro';
import { Patient } from 'fhir/r4b';

import { MenuLayoutValue } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';
import {
    DashboardIcon,
    EncountersIcon,
    InvoicesIcon,
    MedicationsIcon,
    OrganizationsIcon,
    PatientsIcon,
    PrescriptionsIcon,
    ServicesIcon,
} from '@beda.software/emr/icons';

import { matchCurrentUserRole, Role } from 'src/utils/role';

/**
 * Sidebar per role.
 *
 * Every staff member lands on their own station's queue — it is the first entry, so it is
 * also where `AuthenticatedRoutes` sends them after sign-in. The patient list comes second
 * because every station occasionally needs to look a patient up, but only reception can
 * open a visit from it. Keep this in step with `routes.tsx`: a menu entry whose path has no
 * route silently redirects back to the first entry.
 */

const patients = () => ({ label: t`Patients`, path: '/patients', icon: <PatientsIcon /> });
const encounters = () => ({ label: t`Visits`, path: '/encounters', icon: <EncountersIcon /> });
const invoices = () => ({ label: t`Invoices`, path: '/invoices', icon: <InvoicesIcon /> });
const priceList = () => ({ label: t`Price list`, path: '/price-list', icon: <ServicesIcon /> });

export const menuLayout: MenuLayoutValue = () => {
    try {
        return matchCurrentUserRole({
            [Role.Receptionist]: () => [patients(), encounters()],
            [Role.TriageNurse]: () => [
                { label: t`Triage`, path: '/queue/triage', icon: <DashboardIcon /> },
                patients(),
            ],
            [Role.Clinician]: () => [
                { label: t`Consultations`, path: '/queue/consultations', icon: <DashboardIcon /> },
                patients(),
                encounters(),
            ],
            [Role.LabTechnician]: () => [
                { label: t`Laboratory`, path: '/queue/laboratory', icon: <ServicesIcon /> },
                patients(),
            ],
            [Role.Pharmacist]: () => [
                { label: t`Pharmacy`, path: '/queue/pharmacy', icon: <MedicationsIcon /> },
                patients(),
            ],
            [Role.Cashier]: () => [
                { label: t`Billing`, path: '/queue/billing', icon: <PrescriptionsIcon /> },
                patients(),
                invoices(),
                priceList(),
            ],
            [Role.Administrator]: () => [
                patients(),
                encounters(),
                invoices(),
                priceList(),
                { label: t`Services`, path: '/healthcare-services', icon: <ServicesIcon /> },
                { label: t`Organizations`, path: '/organizations', icon: <OrganizationsIcon /> },
            ],
            [Role.Patient]: (patient: Patient) => [
                { label: t`Patient`, path: `/patients/${patient!.id}`, icon: <PatientsIcon /> },
            ],
        });
    } catch {
        return [];
    }
};

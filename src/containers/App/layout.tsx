import { t } from '@lingui/macro';
import { Patient } from 'fhir/r4b';

import { MenuLayoutValue } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';
import { OrganizationsIcon, PatientsIcon, PractitionersIcon, ServicesIcon } from '@beda.software/emr/icons';

import { matchCurrentUserRole, Role } from 'src/utils/role';

const adminDigitalHealthItems = () => [
    { label: t`Services`, path: '/healthcare-services', icon: <ServicesIcon /> },
    { label: t`Practitioners`, path: '/practitioners', icon: <PractitionersIcon /> },
    { label: t`Organizations`, path: '/organizations', icon: <OrganizationsIcon /> },
    { label: t`Locations`, path: '/locations', icon: <OrganizationsIcon /> },
];

export const menuLayout: MenuLayoutValue = () =>
    matchCurrentUserRole({
        [Role.Administrator]: () => [{ label: t`Patients`, path: '/patients', icon: <PatientsIcon /> }],
        [Role.Clinician]: () => [{ label: t`Patients`, path: '/patients', icon: <PatientsIcon /> }],
        [Role.Receptionist]: () => [{ label: t`Patients`, path: '/patients', icon: <PatientsIcon /> }],
        [Role.TriageNurse]: () => [{ label: t`Patients`, path: '/patients', icon: <PatientsIcon /> }],
        [Role.LabTechnician]: () => [{ label: t`Patients`, path: '/patients', icon: <PatientsIcon /> }],
        [Role.Pharmacist]: () => [{ label: t`Patients`, path: '/patients', icon: <PatientsIcon /> }],
        [Role.Cashier]: () => [{ label: t`Patients`, path: '/patients', icon: <PatientsIcon /> }],
        [Role.Patient]: (patient: Patient) => [
            { label: t`Patient`, path: `/patients/${patient!.id}`, icon: <PatientsIcon /> },
        ],
    });

export const digitalHealthMenuLayout: MenuLayoutValue = () =>
    matchCurrentUserRole({
        [Role.Administrator]: adminDigitalHealthItems,
        [Role.Clinician]: adminDigitalHealthItems,
        [Role.Receptionist]: () => [],
        [Role.TriageNurse]: () => [],
        [Role.LabTechnician]: () => [],
        [Role.Pharmacist]: () => [],
        [Role.Cashier]: () => [],
        [Role.Patient]: () => [],
    });

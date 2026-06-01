import { t } from '@lingui/macro';
import { Patient } from 'fhir/r4b';

import { MenuLayoutValue } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';
import { PatientsIcon } from '@beda.software/emr/icons';

import { matchCurrentUserRole, Role } from 'src/utils/role';

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

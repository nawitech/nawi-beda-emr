import { t } from "@lingui/macro";

import { MenuLayoutValue } from "@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context";
import {OrganizationsIcon, PatientsIcon, PractitionersIcon, ServicesIcon} from '@beda.software/emr/icons';
import {matchCurrentUserRole, Role} from '@beda.software/emr/utils'

export const menuLayout: MenuLayoutValue = () =>
    matchCurrentUserRole({
        [Role.Admin]: () => [
            { label: t`Patients`, path: '/patients', icon: <PatientsIcon /> },
        ],
        [Role.Practitioner]: () => [
            { label: t`Patients`, path: '/patients', icon: <PatientsIcon /> },
        ],
        [Role.Patient]: () => [],
        [Role.Receptionist]: () => [],
    });


export const digitalHealthMenuLayout: MenuLayoutValue = () =>
    matchCurrentUserRole({
        [Role.Admin]: () => [
            { label: t`Services`, path: '/healthcare-services', icon: <ServicesIcon /> },
            { label: t`Practitioners`, path: '/practitioners', icon: <PractitionersIcon /> },
            { label: t`Organizations`, path: '/organizations', icon: <OrganizationsIcon /> },
            { label: t`Locations`, path: '/locations', icon: <OrganizationsIcon /> },
        ],
        [Role.Practitioner]: () => [
            { label: t`Services`, path: '/healthcare-services', icon: <ServicesIcon /> },
            { label: t`Practitioners`, path: '/practitioners', icon: <PractitionersIcon /> },
            { label: t`Organizations`, path: '/organizations', icon: <OrganizationsIcon /> },
            { label: t`Locations`, path: '/locations', icon: <OrganizationsIcon /> },
        ],
        [Role.Patient]: () => [],
        [Role.Receptionist]: () => [],
    });

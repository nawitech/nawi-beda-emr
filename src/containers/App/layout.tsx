import { t } from "@lingui/macro";

import { MenuLayoutValue } from "@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context";
import {PatientsIcon} from '@beda.software/emr/icons';
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

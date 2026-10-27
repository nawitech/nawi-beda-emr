import { LogoutOutlined } from '@ant-design/icons';
import { t } from '@lingui/macro';

import { sharedAuthorizedUser } from '@beda.software/emr/sharedState';

import { AvatarImage } from 'src/images/AvatarImage';
import { doLogout } from 'src/services/auth';
import { matchCurrentUserRole, Role } from 'src/utils/role';

import { OrganizationName, PatientName, PractitionerName } from './userName';

export function keycloakBottomMenuLayout(onItemClick?: () => void) {
    const user = sharedAuthorizedUser.getSharedState()!;
    const hasRole = (user?.role || []).length > 0;

    return [
        {
            key: 'user',
            icon: <AvatarImage />,
            label: (
                <>
                    {hasRole
                        ? matchCurrentUserRole({
                              [Role.Administrator]: () => <OrganizationName />,
                              [Role.Patient]: () => <PatientName />,
                              [Role.Clinician]: () => <PractitionerName />,
                              [Role.Receptionist]: () => <PractitionerName />,
                              [Role.TriageNurse]: () => <PractitionerName />,
                              [Role.LabTechnician]: () => <PractitionerName />,
                              [Role.Pharmacist]: () => <PractitionerName />,
                              [Role.Cashier]: () => <PractitionerName />,
                          })
                        : user?.email}
                </>
            ),
            children: [
                {
                    label: t`Log out`,
                    key: 'logout',
                    onClick: () => {
                        doLogout();
                        onItemClick?.();
                    },
                    icon: <LogoutOutlined />,
                },
            ],
        },
    ];
}

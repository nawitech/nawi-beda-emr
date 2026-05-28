import { LogoutOutlined } from '@ant-design/icons';
import { t } from '@lingui/macro';

import {
    sharedAuthorizedOrganization,
    sharedAuthorizedPatient,
    sharedAuthorizedPractitioner,
    sharedAuthorizedUser,
} from '@beda.software/emr/sharedState';
import { matchCurrentUserRole, renderHumanName, Role } from '@beda.software/emr/utils';

import { AvatarImage } from 'src/images/AvatarImage';
import { doLogout } from 'src/services/auth';

function PatientName() {
    const [patient] = sharedAuthorizedPatient.useSharedState();
    const name = patient?.name?.[0];
    if (name) return <span>{renderHumanName(name)}</span>;
    return <span>{patient?.telecom?.find(({ system }) => system === 'email')?.value}</span>;
}

function PractitionerName() {
    const [practitioner] = sharedAuthorizedPractitioner.useSharedState();
    return <span>{renderHumanName(practitioner?.name?.[0])}</span>;
}

function OrganizationName() {
    const [organization] = sharedAuthorizedOrganization.useSharedState();
    return <span>{organization?.name}</span>;
}

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
                              [Role.Admin]: () => <OrganizationName />,
                              [Role.Patient]: () => <PatientName />,
                              [Role.Practitioner]: () => <PractitionerName />,
                              [Role.Receptionist]: () => <PractitionerName />,
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

import { t, Trans } from '@lingui/macro';
import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import { Claim, ParametersParameter } from 'fhir/r4b';

import { ResourceListPage } from '@beda.software/emr/uberComponents';
import { navigationAction, questionnaireAction } from '@beda.software/emr/dist/uberComponents/ResourceListPage/actions';
import type { RecordType } from '@beda.software/emr/dist/uberComponents/ResourceListPage/types';
import { formatHumanDate, renderHumanName } from '@beda.software/emr/utils';

import { currentPractitioner } from 'src/containers/PatientDetails/dashboard/launchContext';

import {
    claimTotal,
    findClaimPatient,
    findClaimResponse,
    payerDateOfBirth,
    rejectionCode,
    REJECTION_WORKQUEUE_SEARCH_PARAMS,
} from '../service';

export function RejectionWorkqueue() {
    const getTableColumns = (): ColumnsType<RecordType<Claim>> => [
        {
            title: <Trans>Patient</Trans>,
            key: 'patient',
            render: (_text, { resource, bundle }) => {
                const patient = findClaimPatient(bundle, resource);

                return renderHumanName(patient?.name?.[0]) || '—';
            },
        },
        {
            title: <Trans>Claim</Trans>,
            key: 'claim',
            render: (_text, { resource }) => resource.id,
        },
        {
            title: <Trans>Date of service</Trans>,
            key: 'dos',
            render: (_text, { resource }) =>
                resource.billablePeriod?.start ? formatHumanDate(resource.billablePeriod.start) : '—',
        },
        {
            title: <Trans>Billed</Trans>,
            key: 'billed',
            render: (_text, { resource }) => claimTotal(resource),
        },
        {
            title: <Trans>Rejection</Trans>,
            key: 'rejection',
            render: (_text, { resource, bundle }) => {
                const response = findClaimResponse(bundle, resource);

                return (
                    <Typography.Text type="danger" style={{ fontSize: 12 }}>
                        {rejectionCode(response)}
                    </Typography.Text>
                );
            },
        },
        {
            title: <Trans>Subscriber DOB</Trans>,
            key: 'dob',
            render: (_text, { resource, bundle }) => {
                const patient = findClaimPatient(bundle, resource);
                const response = findClaimResponse(bundle, resource);
                const onFile = patient?.birthDate;
                const payer = payerDateOfBirth(response);
                const mismatch = Boolean(payer && onFile && payer !== onFile);

                return (
                    <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                        <div>
                            <Trans>our record</Trans> <Tag color={mismatch ? 'red' : 'default'}>{onFile ?? '—'}</Tag>
                        </div>
                        <div>
                            <Trans>payer record</Trans> <Tag color={mismatch ? 'green' : 'default'}>{payer ?? '—'}</Tag>
                        </div>
                    </div>
                );
            },
        },
    ];

    const getClinicalContext = (record: RecordType<Claim> | undefined): ParametersParameter[] => {
        if (!record) {
            return [];
        }

        const { resource: claim, bundle } = record;
        const patient = findClaimPatient(bundle, claim);
        const response = findClaimResponse(bundle, claim);
        const author = currentPractitioner();

        return [
            { name: 'Claim', resource: claim },
            ...(patient ? [{ name: 'Patient', resource: patient }] : []),
            ...(response ? [{ name: 'ClaimResponse', resource: response }] : []),
            ...(author ? [{ name: 'Author', resource: author }] : []),
        ];
    };

    return (
        <ResourceListPage<Claim>
            headerTitle={t`Clearinghouse rejections`}
            resourceType="Claim"
            searchParams={REJECTION_WORKQUEUE_SEARCH_PARAMS}
            getTableColumns={getTableColumns}
            getClinicalContext={getClinicalContext}
            getRecordActions={(record) => [
                navigationAction(
                    t`Open patient record`,
                    `/patients/${findClaimPatient(record.bundle, record.resource)?.id}`,
                ),
                questionnaireAction(t`Correct and resubmit`, 'correct-and-resubmit-claim'),
            ]}
            getReportColumns={(bundle) => [
                {
                    title: t`Rejections awaiting rework`,
                    value: bundle.total ?? '—',
                },
            ]}
        />
    );
}

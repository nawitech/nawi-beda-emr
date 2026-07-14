import { Trans } from '@lingui/macro';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { Bundle, Claim } from 'fhir/r4b';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { service } from '@beda.software/emr/services';
import { isSuccess } from '@beda.software/remote-data';

interface Workqueue {
    key: string;
    label: React.ReactNode;
    params: Record<string, string | number>;
    to?: string;
    danger?: boolean;
}

const WORKQUEUES: Workqueue[] = [
    {
        key: 'ready',
        label: <Trans>Ready to submit</Trans>,
        params: { status: 'draft', _total: 'accurate', _summary: 'count' },
    },
    {
        key: 'submitted',
        label: <Trans>Submitted to clearinghouse</Trans>,
        params: { status: 'active', _total: 'accurate', _summary: 'count' },
    },
    {
        key: 'rejections',
        label: <Trans>Clearinghouse rejections</Trans>,
        params: {
            '_has:ClaimResponse:request:outcome': 'error',
            '_has:ClaimResponse:request:status': 'active',
            _total: 'accurate',
            _summary: 'count',
        },
        to: '/billing/rejections',
        danger: true,
    },
];

interface QueueState {
    count: number | null;
    dollars: number;
}

export function Billing() {
    const [counts, setCounts] = useState<Record<string, QueueState>>({});

    useEffect(() => {
        let cancelled = false;

        Promise.all(
            WORKQUEUES.map(async (queue) => {
                const { _summary, ...withResources } = queue.params;
                void _summary;

                const response = await service<Bundle<Claim>>({
                    url: '/Claim',
                    params: { ...withResources, _count: 100 },
                });

                if (!isSuccess(response)) {
                    return [queue.key, { count: null, dollars: 0 }] as const;
                }

                const claims = (response.data.entry ?? [])
                    .map((entry) => entry.resource)
                    .filter((resource): resource is Claim => resource?.resourceType === 'Claim');

                return [
                    queue.key,
                    {
                        count: response.data.total ?? claims.length,
                        dollars: claims.reduce((sum, claim) => sum + (claim.total?.value ?? 0), 0),
                    },
                ] as const;
            }),
        ).then((entries) => {
            if (!cancelled) {
                setCounts(Object.fromEntries(entries));
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <Typography.Title level={3}>
                <Trans>Billing</Trans>
            </Typography.Title>

            <Row gutter={16}>
                {WORKQUEUES.map((queue) => {
                    const state = counts[queue.key];
                    const count = state?.count;
                    const card = (
                        <Card hoverable={Boolean(queue.to)}>
                            <Statistic
                                title={queue.label}
                                value={count ?? '—'}
                                valueStyle={queue.danger && count ? { color: '#cf1322' } : undefined}
                            />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {state ? (
                                    <Trans>
                                        {state.dollars.toLocaleString('en-US', {
                                            style: 'currency',
                                            currency: 'USD',
                                        })}{' '}
                                        billed
                                    </Trans>
                                ) : null}
                            </Typography.Text>
                        </Card>
                    );

                    return (
                        <Col span={8} key={queue.key}>
                            {queue.to ? <Link to={queue.to}>{card}</Link> : card}
                        </Col>
                    );
                })}
            </Row>

            <Typography.Paragraph type="secondary" style={{ marginTop: 16, maxWidth: 720 }}>
                <Trans>
                    Front-end rejections never reach the payer. They are lost revenue until someone works them, and they
                    are usually caused by inaccurate demographic data rather than by coding.
                </Trans>
            </Typography.Paragraph>
        </div>
    );
}

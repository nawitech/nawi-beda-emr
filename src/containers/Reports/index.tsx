import { BarChartOutlined, ExperimentOutlined } from '@ant-design/icons';
import { Trans } from '@lingui/macro';
import { Card, Col, Row, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';

export function Reports() {
    return (
        <div style={{ padding: 24, maxWidth: 1000 }}>
            <Typography.Title level={3}>
                <Trans>Reports</Trans>
            </Typography.Title>

            <Row gutter={16}>
                <Col span={12}>
                    <Link to="/reports/clinic-activity">
                        <Card hoverable>
                            <Typography.Title level={5}>
                                <BarChartOutlined /> <Trans>Clinic Activity — Current Month</Trans>{' '}
                                <Tag color="blue">
                                    <Trans>Standard report</Trans>
                                </Tag>
                            </Typography.Title>
                            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                <Trans>
                                    Visits and unique patients seen by clinical staff, month to date. The period is
                                    fixed by the report definition.
                                </Trans>
                            </Typography.Paragraph>
                        </Card>
                    </Link>
                </Col>

                <Col span={12}>
                    <Link to="/reports/ad-hoc">
                        <Card hoverable>
                            <Typography.Title level={5}>
                                <ExperimentOutlined /> <Trans>Ad Hoc Report Builder</Trans>{' '}
                                <Tag color="purple">
                                    <Trans>Custom</Trans>
                                </Tag>
                            </Typography.Title>
                            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                <Trans>
                                    The same measures, but you choose the period and the clinicians when you run it.
                                    Export to CSV or send by email.
                                </Trans>
                            </Typography.Paragraph>
                        </Card>
                    </Link>
                </Col>
            </Row>
        </div>
    );
}

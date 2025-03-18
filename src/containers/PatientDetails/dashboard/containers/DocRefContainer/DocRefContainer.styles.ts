import styled from 'styled-components';
import { Typography } from 'antd';

export const S = {
    Container: styled.div`
        display: flex;
        flex-direction: column;
        gap: 10px;
    `,
    PatientSummaryItemContainer: styled.div`
        display: flex;
        flex-direction: column;
    `,
    PatientSummaryItemText: styled(Typography.Text)`
        white-space: pre-line;
    `,
};

import { Typography } from 'antd';
import styled from 'styled-components';

export const S = {
    Container: styled.div`
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
    `,
    PatientSummaryItemContainer: styled.div`
        display: flex;
        flex-direction: column;
    `,
    PatientSummaryItemText: styled(Typography.Text)`
        white-space: pre-line;
    `,
    ResourceFetchInfoContainer: styled.div`
        display: flex;
        flex-direction: column;
        gap: 10px;
    `
};

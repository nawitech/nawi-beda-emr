import styled from 'styled-components';

export const S = {
    Container: styled.div`
        display: flex;
        flex-direction: column;
        gap: 24px;
    `,
    DetailsRow: styled.div`
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 13px 16px;
        flex-wrap: wrap;
        gap: 16px;
        @media screen and (max-width: 680px) {
            flex-direction: column;
            align-items: flex-start;
        }
    `,
    DetailItem: styled.div`
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        font-weight: 500;
    `,
    DetailsTitle: styled.div`
        color: ${({ theme }) => theme.neutralPalette.gray_7};
    `,
};
